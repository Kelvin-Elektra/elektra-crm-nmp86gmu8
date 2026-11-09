import pb from '@/lib/pocketbase/client'
import { createProposalHistory } from '@/services/proposal-history'
import { createGeneratorProposal, getTemplatesResponse } from '@/services/templates'
import { enrichPayloadWithSemanticVariables } from '@/lib/semantic-mapper'
import {
  calculateConsumptionCoverage,
  calculateOccupiedArea,
  calculateCo2Avoided,
  calculateInvestmentMultiple,
  calculateTir,
  calculateDetailed25YearsProjection,
  generateSavingsProjection,
  extractValidityDays,
  formatProposalDate,
  extractEstimatedMonthlyGeneration,
  buildEquipmentsArray,
  buildCommercialConditionsArray,
} from '@/lib/solar-calculations'

export interface RegenerateProposalParams {
  proposal: any
  updatedSnapshot: any
  saveFinalTotal: number
  subtotal: number
  saveDiscountPct: number
  costBreakdown?: any[]
  user?: any
  paymentTerms?: string
  definedPaymentMethod?: string
  acceptedPaymentMethods?: string[]
  installationLeadTime?: string
  validityDate?: string | null
  hasFinancing?: boolean
  notes?: string
}

export interface RegenerateProposalResult {
  updatedViewUrl: string | null
  updatedSnapshot: any
  generatorSyncFailed: boolean
}

/**
 * Regenera e sincroniza uma proposta comercial:
 * 1. Grava PRIMEIRO no banco de dados (PATCH em `proposals` + histórico)
 *    para que os hooks do Gerador leiam dados frescos do banco.
 * 2. Se a proposta possuir template do Gerador externo, dispara `createGeneratorProposal`
 *    com o MESMO external_id da proposta original, preservando o histórico e atualizando a view_url.
 */
export async function saveAndRegenerateProposal(
  params: RegenerateProposalParams,
): Promise<RegenerateProposalResult> {
  const {
    proposal,
    updatedSnapshot,
    saveFinalTotal,
    subtotal,
    saveDiscountPct,
    user,
    costBreakdown,
    paymentTerms = proposal.payment_terms || '',
    definedPaymentMethod = updatedSnapshot.defined_payment_method || '',
    acceptedPaymentMethods = updatedSnapshot.accepted_payment_methods || [],
    installationLeadTime = updatedSnapshot.installation_lead_time || '',
    validityDate = proposal.validity_date || null,
    hasFinancing = proposal.has_financing || false,
    notes = proposal.notes || '',
  } = params

  const effectiveCostBreakdown =
    costBreakdown || updatedSnapshot.cost_breakdown || proposal.cost_breakdown || undefined

  const templateId =
    updatedSnapshot.generator_template_id ||
    updatedSnapshot.template ||
    proposal.template_id ||
    null

  let updatedViewUrl = proposal.view_url || updatedSnapshot.view_url || null
  let generatorSyncFailed = false

  if (templateId) {
    try {
      const leadDoc = updatedSnapshot.lead_document || updatedSnapshot.document || ''
      const leadPh = updatedSnapshot.lead_phone || updatedSnapshot.phone || ''
      const leadCity =
        updatedSnapshot.sizing?.address_struct?.city ||
        updatedSnapshot.sizing?.city ||
        updatedSnapshot.city ||
        ''
      const leadState =
        updatedSnapshot.sizing?.address_struct?.state ||
        updatedSnapshot.sizing?.state ||
        updatedSnapshot.state ||
        ''

      const leadData = {
        name: updatedSnapshot.lead_name || 'Cliente',
        email: updatedSnapshot.lead_email || updatedSnapshot.email || '',
        phone: leadPh,
        whatsapp: leadPh,
        document: leadDoc,
        cpf_cnpj: leadDoc,
        address: updatedSnapshot.address || '',
        city: leadCity,
        state: leadState,
      }

      const consultantName =
        (proposal as any)?.consultant_name ||
        (proposal as any)?.expand?.negotiation_id?.expand?.owner_id?.name ||
        (proposal as any)?.expand?.owner_id?.name ||
        user?.name ||
        'Consultor Elektra'
      const proposalNumber = proposal.id || ''
      const proposalDate = formatProposalDate(proposal.created)
      const validityDays = extractValidityDays(validityDate, proposal.created, 10)

      const rawSizing = updatedSnapshot.sizing || {}

      const resolvedModule =
        updatedSnapshot.rawModule ||
        updatedSnapshot.pricing?.rawModule ||
        updatedSnapshot.pricing_data?.rawModule ||
        null

      const resolvedInverters =
        updatedSnapshot.rawInverters ||
        updatedSnapshot.pricing?.rawInverters ||
        updatedSnapshot.pricing_data?.rawInverters ||
        rawSizing.inverters ||
        []

      const resolvedSupplies =
        updatedSnapshot.pricing?.kitComposition ||
        updatedSnapshot.pricing?.supplies ||
        updatedSnapshot.kitComposition ||
        updatedSnapshot.supplies ||
        updatedSnapshot.pricing_data?.kitComposition ||
        updatedSnapshot.pricing_data?.supplies ||
        []

      const commercialConditions = buildCommercialConditionsArray({
        paymentTerms,
        definedPaymentMethod,
        acceptedPaymentMethods: acceptedPaymentMethods.join(', '),
        validityDays,
        installationLeadTime,
        moduleWarranty:
          resolvedModule?.warranty || resolvedModule?.warranty_manufacturing || undefined,
        inverterWarranty: resolvedInverters?.[0]?.warranty || undefined,
      })

      const negotiationPayload = {
        id: proposal.negotiation_id,
        validity_date: validityDate || '',
        validity: validityDate || '',
        validity_days: validityDays,
        consultant_name: consultantName,
        proposal_number: proposalNumber,
        proposal_date: proposalDate,
        payment_terms: paymentTerms || '',
        defined_payment_method: definedPaymentMethod || '',
        accepted_payment_methods: acceptedPaymentMethods.join(', '),
        installation_lead_time: installationLeadTime || '',
        notes: notes || '',
        commercial_conditions: commercialConditions,
      }

      const kitPower = Number(rawSizing.kit_power_kwp) || 0
      const avgCons =
        Number(rawSizing.avg_consumption) || Number(updatedSnapshot.avg_consumption) || 0
      const estGen = extractEstimatedMonthlyGeneration(rawSizing, kitPower)
      const modQty = Number(rawSizing.module_qty) || 0
      const consumptionCoveragePct = calculateConsumptionCoverage(estGen, avgCons)
      const occupiedAreaM2 = calculateOccupiedArea(modQty, rawSizing.module_dimensions || null)

      const fp = updatedSnapshot.financialProjection
      const resolvedConcessionaire =
        rawSizing.concessionaire || fp?.tariffDetails?.utility_name || fp?.tariffDetails?.name || ''
      const resolvedRoofType = rawSizing.roof_type || rawSizing.structure_type || ''
      const resolvedTension =
        rawSizing.tension || rawSizing.voltage || fp?.tariffDetails?.voltage || ''

      const editTplId =
        updatedSnapshot.generator_template_id ||
        updatedSnapshot.template ||
        proposal.template_id ||
        null
      const includeSuppliesFlag =
        !editTplId || updatedSnapshot.templates_config?.[editTplId]?.include_supplies !== false
      const equipmentsList = buildEquipmentsArray({
        module: resolvedModule,
        moduleQty: modQty,
        inverters: resolvedInverters,
        supplies: resolvedSupplies,
        includeSupplies: includeSuppliesFlag,
      })

      const sizingPayload: Record<string, any> = {
        ...rawSizing,
        kit_power_kwp: kitPower,
        power_kwp: kitPower,
        kwp: kitPower,
        avg_consumption: avgCons,
        average_consumption: avgCons,
        average_monthly_consumption_kwh: avgCons,
        monthly_consumption: avgCons,
        consumption_kwh: avgCons,
        estimated_monthly_generation: estGen,
        monthly_generation: estGen,
        generation_kwh: estGen,
        estimated_generation_kwh: estGen,
        consumption_coverage_pct: consumptionCoveragePct,
        occupied_area_m2: occupiedAreaM2,
        module_qty: modQty,
        module_quantity: modQty,
        modules_count: modQty,
        concessionaire: resolvedConcessionaire,
        roof_type: resolvedRoofType,
        tension: resolvedTension,
        city: leadCity,
        state: leadState,
        equipments: equipmentsList,
        commercial_conditions: commercialConditions,
      }
      if (resolvedConcessionaire) sizingPayload.concessionaire = resolvedConcessionaire
      if (resolvedRoofType) sizingPayload.roof_type = resolvedRoofType
      if (resolvedTension) sizingPayload.tension = resolvedTension
      sizingPayload.equipments = equipmentsList

      const paybackYearsVal =
        fp?.roiYears != null
          ? Number((fp.roiYears + (fp.roiRemainingMonths || 0) / 12).toFixed(1))
          : Number(fp?.paybackYears) || 0
      const monthlySav = Number(fp?.monthlySavings) || 0
      const annualSavingsVal = Number(fp?.annualSavings) || monthlySav * 12
      const co2AvoidedTon = calculateCo2Avoided(estGen)

      const prevCalcSnap = proposal.calc_snapshot || updatedSnapshot.calc_snapshot || {}
      // O calc_snapshot congelado pode ter annual_tariff_adjustment: 0 gravado;
      // ele NÃO deve prevalecer. Resolução na MESMA ordem da FinancialAnalysisCard:
      // (a) override explícito na negociação (> 0), (b) reajuste da concessionária
      // da negociação (pv_utilities), (c) fallback companies.annual_tariff_adjustment.
      let annualTariffAdjustment = 0
      let resolvedAdjustmentSource: string | null = null

      const negAdjRaw = Number(proposal?.expand?.negotiation_id?.annual_tariff_adjustment)
      const sizingAdjRaw = Number(rawSizing.annual_tariff_adjustment)
      if (!isNaN(negAdjRaw) && negAdjRaw > 0) {
        annualTariffAdjustment = negAdjRaw
        resolvedAdjustmentSource = 'negotiation_override'
      } else if (!isNaN(sizingAdjRaw) && sizingAdjRaw > 0) {
        annualTariffAdjustment = sizingAdjRaw
        resolvedAdjustmentSource = 'negotiation_sizing_override'
      }

      if (resolvedAdjustmentSource === null) {
        const utilityId = proposal?.expand?.negotiation_id?.utility_id || null
        if (utilityId) {
          try {
            const utilRec: any = await pb.collection('pv_utilities').getOne(utilityId)
            const utilAdj = Number(utilRec?.annual_tariff_adjustment)
            if (!isNaN(utilAdj) && utilRec?.annual_tariff_adjustment != null) {
              annualTariffAdjustment = utilAdj
              resolvedAdjustmentSource = 'pv_utilities'
            }
          } catch {
            /* concessionária não encontrada: segue para o fallback da companhia */
          }
        }
      }

      if (resolvedAdjustmentSource === null) {
        const companyId =
          proposal.company_id || proposal?.expand?.negotiation_id?.company_id || null
        if (companyId) {
          try {
            const compRec: any = await pb.collection('companies').getOne(companyId)
            const compAdj = Number(compRec?.annual_tariff_adjustment)
            if (!isNaN(compAdj) && compRec?.annual_tariff_adjustment != null) {
              annualTariffAdjustment = compAdj
              resolvedAdjustmentSource = 'companies'
            }
          } catch {
            /* companhia não encontrada: mantém 0 */
          }
        }
      }
      const annualDegradation =
        prevCalcSnap.annual_degradation != null
          ? Number(prevCalcSnap.annual_degradation)
          : fp?.annual_degradation != null
            ? Number(fp.annual_degradation)
            : Number(resolvedModule?.annual_degradation) ||
              Number(updatedSnapshot.pricing_data?.rawModule?.annual_degradation) ||
              0.5
      // Diagnóstico do reajuste resolvido (visível no console do navegador
      // durante a regeneração, sem quebrar o fluxo em produção).
      console.info(
        `[proposal-regenerator] annual_tariff_adjustment resolvido: ${annualTariffAdjustment} (fonte: ${resolvedAdjustmentSource ?? 'nenhuma/0'})`,
      )

      const detailedProjectionTable = calculateDetailed25YearsProjection({
        annualConsumptionKwh: avgCons * 12,
        annualGenerationYear1Kwh: estGen * 12,
        annualDegradationPct: annualDegradation,
        annualTariffAdjustmentPct: annualTariffAdjustment,
        simultaneityFactor: Number(rawSizing.simultaneity_factor) || 30,
        tariffDetails: fp?.tariffDetails || {
          te: 0,
          tusd: 0,
          icms_rate: 0,
          icms_exemption: 'none',
          fio_b_value: 0.22,
        },
        publicLightingFeeMonthly: Number(fp?.publicLightingFee) || 0,
        totalInvestment: saveFinalTotal,
        years: 25,
      })

      const savings25YearsVal =
        detailedProjectionTable.length > 0
          ? detailedProjectionTable[detailedProjectionTable.length - 1].cumulativeSavings
          : Number(fp?.savings25Years) || annualSavingsVal * 25
      const investmentMultiple = calculateInvestmentMultiple(savings25YearsVal, saveFinalTotal)
      const tirPct = calculateTir(saveFinalTotal, annualSavingsVal, 25)
      const savingsProjection = generateSavingsProjection(detailedProjectionTable)

      const calcSnapshot = {
        ...prevCalcSnap,
        frozen_at: prevCalcSnap.frozen_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        annual_degradation: annualDegradation,
        annual_tariff_adjustment: annualTariffAdjustment,
        simultaneity_factor: Number(rawSizing.simultaneity_factor) || 30,
        tariff_details: fp?.tariffDetails || prevCalcSnap.tariff_details || {},
        total_investment: saveFinalTotal,
        savings_projection_table: detailedProjectionTable,
        savings_25_years: savings25YearsVal,
        payback_years: paybackYearsVal,
        tir_pct: tirPct,
        investment_multiple: investmentMultiple,
      }

      const financialPayload = {
        total_investment: saveFinalTotal,
        investment: saveFinalTotal,
        price: saveFinalTotal,
        total_value: saveFinalTotal,
        sale_price: saveFinalTotal,
        subtotal: subtotal,
        discount_amount: saveDiscountPct,
        has_financing: hasFinancing,
        contempla_financiamento: hasFinancing,
        monthly_savings: monthlySav,
        economy_monthly: monthlySav,
        estimated_monthly_savings: monthlySav,
        payback_years: paybackYearsVal,
        payback_months: Number(fp?.roiMonths) || 0,
        payback: paybackYearsVal,
        annual_savings: annualSavingsVal,
        yearly_savings: annualSavingsVal,
        savings_25_years: savings25YearsVal,
        total_savings_25y: savings25YearsVal,
        annual_tariff_adjustment: annualTariffAdjustment,
        annual_degradation: annualDegradation,
        investment_multiple: investmentMultiple,
        tir_pct: tirPct,
        co2_avoided_ton: co2AvoidedTon,
        tariff_details: fp?.tariffDetails || {},
        savings_projection: savingsProjection,
        savings_projection_table: detailedProjectionTable,
        calc_snapshot: calcSnapshot,
      }

      updatedSnapshot.calc_snapshot = calcSnapshot

      let templateFields: any[] | undefined = undefined
      let dynamicSchema: any = undefined
      try {
        const templatesRes = await getTemplatesResponse()
        const found = templatesRes.templates.find((t) => t.id === templateId)
        if (found?.variable_schema?.fixed) {
          templateFields = found.variable_schema.fixed
        }
        if (found?.variable_schema?.dynamic) {
          dynamicSchema = found.variable_schema.dynamic
        }
      } catch {
        /* intentionally ignored */
      }

      const enriched = enrichPayloadWithSemanticVariables(dynamicSchema, {
        lead: leadData,
        negotiation: negotiationPayload,
        sizing: sizingPayload,
        financial: financialPayload,
      })

      // 1. Gravar PRIMEIRO no banco de dados para que o hook do Gerador leia
      // os valores e snapshot ATUAIS e frescos em vez do estado anterior.
      const proposalUpdatePayload: Record<string, any> = {
        discount_amount: saveDiscountPct,
        total_value: saveFinalTotal,
        price: subtotal,
        payment_terms: paymentTerms,
        has_financing: hasFinancing,
        notes: notes,
        validity_date: validityDate ? new Date(validityDate).toISOString() : null,
        snapshot_data: updatedSnapshot,
        calc_snapshot: updatedSnapshot.calc_snapshot || null,
        external_id: proposal.id,
        ...(updatedViewUrl ? { view_url: updatedViewUrl } : {}),
      }
      if (effectiveCostBreakdown !== undefined) {
        proposalUpdatePayload.cost_breakdown = effectiveCostBreakdown
      }

      await pb.collection('proposals').update(proposal.id, proposalUpdatePayload)
      await createProposalHistory(proposal.id, updatedSnapshot)

      // 2. Chamar o Gerador DEPOIS da gravação no banco, com o mesmo external_id
      const genRes = await createGeneratorProposal(
        {
          template_id: templateId,
          external_id: proposal.id,
          fixed_data: updatedSnapshot.fixed_data || updatedSnapshot.branding || {},
          lead: enriched.lead,
          negotiation: enriched.negotiation,
          sizing: enriched.sizing,
          financial: enriched.financial,
          dynamic: enriched.dynamic,
          manual_mappings: updatedSnapshot.manual_mappings || undefined,
        },
        templateFields,
      )

      if (genRes?.view_url) {
        updatedViewUrl = genRes.view_url
        updatedSnapshot.view_url = genRes.view_url
        await pb.collection('proposals').update(proposal.id, {
          view_url: updatedViewUrl,
          snapshot_data: updatedSnapshot,
        })
      }
    } catch (genErr) {
      console.warn('Aviso: Não foi possível atualizar no gerador remoto:', genErr)
      generatorSyncFailed = true
    }
  } else {
    // Se não possui templateId do Gerador, salva diretamente no banco
    const proposalUpdatePayload: Record<string, any> = {
      discount_amount: saveDiscountPct,
      total_value: saveFinalTotal,
      price: subtotal,
      payment_terms: paymentTerms,
      has_financing: hasFinancing,
      notes: notes,
      validity_date: validityDate ? new Date(validityDate).toISOString() : null,
      snapshot_data: updatedSnapshot,
      calc_snapshot: updatedSnapshot.calc_snapshot || null,
      external_id: proposal.id,
      ...(updatedViewUrl ? { view_url: updatedViewUrl } : {}),
    }
    if (effectiveCostBreakdown !== undefined) {
      proposalUpdatePayload.cost_breakdown = effectiveCostBreakdown
    }

    await pb.collection('proposals').update(proposal.id, proposalUpdatePayload)
    await createProposalHistory(proposal.id, updatedSnapshot)
  }

  return {
    updatedViewUrl,
    updatedSnapshot,
    generatorSyncFailed,
  }
}
