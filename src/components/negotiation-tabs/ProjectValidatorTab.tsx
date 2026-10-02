import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Boxes,
  Compass,
  Gauge,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import {
  checkInverterVoltageCompatibility,
  calculateInverterMatchSummary,
} from '@/lib/solar-calculations'
import { getVoltagesForNetwork } from '@/types/electric-network'

export type ValidationStatus = 'ok' | 'warning' | 'error' | 'manual'

export interface ValidationItem {
  id: string
  title: string
  status: ValidationStatus
  category: 'cc_ca' | 'grid_voltage' | 'faces' | 'inverter_limits'
  summary: string
  details: string
  recommendation?: string
  metrics?: { label: string; value: string }[]
}

interface ProjectValidatorTabProps {
  negotiation: any
  modules: any[]
  inverters: any[]
  utilities: any[]
  efficiencyRules?: any
}

export function ProjectValidatorTab({
  negotiation,
  modules,
  inverters,
  utilities,
  efficiencyRules,
}: ProjectValidatorTabProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const neg = negotiation || {}
  const sizing = neg.sizing || {}

  // 1. DADOS DOS MÓDULOS
  const selectedModId = sizing.selected_module_id || sizing.moduleId || ''
  const selectedMod = modules.find((m) => m.id === selectedModId)
  const modulePowerW = Number(selectedMod?.power || sizing.module_power || sizing.power_w || 0)
  const totalModuleQty = Number(
    sizing.module_qty ?? sizing.module_quantity ?? sizing.modules_count ?? 0,
  )
  const totalDcPowerKwp =
    totalModuleQty > 0 && modulePowerW > 0
      ? (totalModuleQty * modulePowerW) / 1000
      : Number(sizing.kit_power_kwp || sizing.totalPower || sizing.power_kwp || 0)

  // 2. DADOS DOS INVERSORES
  const rawInverters: Array<{ id?: string; qty?: number; quantity?: number; power?: number }> =
    Array.isArray(sizing.inverters) && sizing.inverters.length > 0
      ? sizing.inverters
      : sizing.selected_inverter_id
        ? [{ id: sizing.selected_inverter_id, qty: 1 }]
        : []

  const populatedInverters = useMemo(() => {
    return rawInverters
      .map((item) => {
        const invRecord = inverters.find((i) => i.id === item.id)
        const qty = Number(item.qty || item.quantity || 1)
        return {
          id: item.id || '',
          qty,
          power: Number(invRecord?.power || item.power || 0),
          record: invRecord,
        }
      })
      .filter((i) => i.id && i.qty > 0)
  }, [rawInverters, inverters])

  const totalAcPowerKw = populatedInverters.reduce(
    (acc, inv) => acc + (inv.power || 0) * (inv.qty || 0),
    0,
  )

  // 3. TENSÕES DA REDE (Concessionária)
  const gridVoltages = useMemo(() => {
    const utilRec = utilities.find((u) => u.id === (neg.utility_id || sizing.utility_id))
    const netType = sizing.network_type || ''

    let phase = sizing.phase_voltage || ''
    let line = sizing.line_voltage || ''

    if (utilRec && netType && (!phase || !line)) {
      const cfg = getVoltagesForNetwork(utilRec.network_voltages, netType)
      if (!phase && cfg.phase) phase = cfg.phase
      if (!line && cfg.line) line = cfg.line
    }

    return {
      phaseVoltage: phase,
      lineVoltage: line,
      tension: sizing.tension || sizing.voltage || '',
      concessionaireName: utilRec?.name || neg.concessionaire || 'Concessionária não informada',
      networkType: netType,
    }
  }, [utilities, neg.utility_id, neg.concessionaire, sizing])

  // 4. CHECKLIST DE ENGENHARIA
  const validationItems = useMemo<ValidationItem[]>(() => {
    const items: ValidationItem[] = []

    // --- ITEM 1: Sobrecarga CC/CA (Razão de carregamento) ---
    const matchSummary = calculateInverterMatchSummary(
      totalDcPowerKwp,
      populatedInverters.map((i) => ({ power: i.power, qty: i.qty })),
    )

    if (totalDcPowerKwp <= 0) {
      items.push({
        id: 'cc_ca_ratio',
        title: 'Sobrecarga CC/CA (Razão de Carregamento)',
        category: 'cc_ca',
        status: 'error',
        summary: 'Módulos fotovoltaicos não definidos no dimensionamento.',
        details:
          'Selecione um módulo fotovoltaico e informe a quantidade para avaliar a relação entre a potência dos painéis (CC) e a potência dos inversores (CA).',
        recommendation: 'Acesse a aba "Dimensionamento" e selecione o modelo de painel.',
        metrics: [{ label: 'Potência CC', value: '0,00 kWp' }],
      })
    } else if (totalAcPowerKw <= 0) {
      items.push({
        id: 'cc_ca_ratio',
        title: 'Sobrecarga CC/CA (Razão de Carregamento)',
        category: 'cc_ca',
        status: 'error',
        summary: 'Nenhum inversor selecionado para atender os módulos.',
        details:
          'O sistema possui painéis fotovoltaicos configurados, mas nenhum inversor foi adicionado.',
        recommendation:
          'Acesse a aba "Dimensionamento" e selecione ao menos um inversor compatível.',
        metrics: [
          { label: 'Potência CC', value: `${totalDcPowerKwp.toFixed(2)} kWp` },
          { label: 'Potência CA', value: '0,00 kW' },
        ],
      })
    } else {
      const ratio = totalDcPowerKwp / totalAcPowerKw
      const ratioPercent = (ratio * 100).toFixed(1)
      let status: ValidationStatus = 'ok'
      let summary = ''
      let details = ''
      let recommendation: string | undefined

      if (ratio < 0.9) {
        status = 'warning'
        summary = `Relação CC/CA de ${ratioPercent}% está abaixo da faixa recomendada (~90% a 130%).`
        details =
          'A potência dos inversores está muito maior que a potência dos painéis. O sistema funcionará, mas há ociosidade de capacidade nos inversores (custo de equipamento superior ao necessário).'
        recommendation =
          'Avalie utilizar um inversor de menor potência nominal ou aumentar o arranjo de módulos.'
      } else if (ratio >= 0.9 && ratio <= 1.3) {
        status = 'ok'
        summary = `Relação CC/CA de ${ratioPercent}% está excelente (faixa saudável entre 90% e 130%).`
        details =
          'Equilíbrio ideal entre a geração dos módulos em condições reais e o aproveitamento térmico e financeiro do inversor.'
      } else if (ratio > 1.3 && ratio <= 1.45) {
        status = 'warning'
        summary = `Relação CC/CA de ${ratioPercent}% está acima de 130% (atenção ao clipping).`
        details =
          'Sobrecarga aceitável para algumas marcas de inversores, mas pode ocorrer corte de pico de geração (clipping) nos horários de máxima irradiação solar.'
        recommendation =
          'Consulte o datasheet do fabricante para confirmar a sobrecarga máxima CC permitida.'
      } else {
        status = 'error'
        summary = `Relação CC/CA de ${ratioPercent}% é excessiva (acima de 145%).`
        details =
          'Risco de superaquecimento, perda expressiva de energia gerada e eventual perda de garantia do inversor por sobrecarga além do limite.'
        recommendation =
          'Adicione outro inversor ou aumente a capacidade nominal CA do inversor escolhido.'
      }

      items.push({
        id: 'cc_ca_ratio',
        title: 'Sobrecarga CC/CA (Razão de Carregamento)',
        category: 'cc_ca',
        status,
        summary,
        details,
        recommendation,
        metrics: [
          { label: 'Potência CC (Módulos)', value: `${totalDcPowerKwp.toFixed(2)} kWp` },
          { label: 'Potência CA (Inversores)', value: `${totalAcPowerKw.toFixed(2)} kW` },
          { label: 'Relação CC/CA', value: `${ratioPercent}% (${ratio.toFixed(2)})` },
          { label: 'Faixa Saudável', value: '90% a 130% (0,9 a 1,3)' },
        ],
      })
    }

    // --- ITEM 2: Compatibilidade de Rede x Inversor ---
    if (populatedInverters.length === 0) {
      items.push({
        id: 'grid_compatibility',
        title: 'Compatibilidade Elétrica (Rede × Inversor)',
        category: 'grid_voltage',
        status: 'manual',
        summary: 'Inversores não definidos para verificação com a rede.',
        details:
          'Selecione inversores na aba "Dimensionamento" para auditar a compatibilidade de tensões com a concessionária.',
      })
    } else {
      let hasError = false
      let hasWarning = false
      const compatReports: string[] = []

      for (const inv of populatedInverters) {
        const invRecord = inv.record
        if (!invRecord) continue
        const comp = checkInverterVoltageCompatibility(invRecord, gridVoltages)
        const invName = `${invRecord.brand || ''} ${invRecord.name || ''}`.trim() || 'Inversor'

        if (!comp.isCompatible) {
          hasError = true
          compatReports.push(`❌ ${invName}: ${comp.summaryText}`)
        } else if (comp.matchedVia) {
          compatReports.push(`✓ ${invName}: ${comp.summaryText}`)
        } else {
          hasWarning = true
          compatReports.push(`⚠ ${invName}: ${comp.summaryText}`)
        }
      }

      const gridInfo = [
        gridVoltages.concessionaireName,
        gridVoltages.networkType ? `(${gridVoltages.networkType})` : '',
        gridVoltages.phaseVoltage ? `Fase: ${gridVoltages.phaseVoltage}V` : '',
        gridVoltages.lineVoltage ? `Linha: ${gridVoltages.lineVoltage}V` : '',
      ]
        .filter(Boolean)
        .join(' · ')

      if (hasError) {
        items.push({
          id: 'grid_compatibility',
          title: 'Compatibilidade Elétrica (Rede × Inversor)',
          category: 'grid_voltage',
          status: 'error',
          summary: 'Inversor selecionado é incompatível com a tensão da concessionária.',
          details: `Rede: ${gridInfo || 'Não informada'}.\n\nDiagnóstico:\n${compatReports.join('\n')}`,
          recommendation:
            'Substitua o inversor por um modelo compatível com a tensão de fase ou linha da rede local (ou instale autotransformador dedicado).',
          metrics: [
            { label: 'Concessionária', value: gridVoltages.concessionaireName },
            {
              label: 'Tensões da Rede',
              value:
                gridVoltages.phaseVoltage && gridVoltages.lineVoltage
                  ? `${gridVoltages.phaseVoltage}V / ${gridVoltages.lineVoltage}V`
                  : gridVoltages.tension || 'Não informada',
            },
          ],
        })
      } else if (hasWarning) {
        items.push({
          id: 'grid_compatibility',
          title: 'Compatibilidade Elétrica (Rede × Inversor)',
          category: 'grid_voltage',
          status: 'warning',
          summary: 'Tensão da rede ou do inversor não preenchida por completo.',
          details: `Rede: ${gridInfo || 'Não informada'}.\n\nDiagnóstico:\n${compatReports.join('\n')}`,
          recommendation:
            'Verifique se a tensão da rede no cadastro da concessionária confere com a ligação do cliente.',
        })
      } else {
        items.push({
          id: 'grid_compatibility',
          title: 'Compatibilidade Elétrica (Rede × Inversor)',
          category: 'grid_voltage',
          status: 'ok',
          summary: 'Todos os inversores são compatíveis com a rede elétrica da concessionária.',
          details: `Compatibilidade garantida via tensão de fase ou linha da concessionária:\n${compatReports.join('\n')}`,
          metrics: [
            { label: 'Concessionária', value: gridVoltages.concessionaireName },
            {
              label: 'Tensões Validadas',
              value:
                gridVoltages.phaseVoltage && gridVoltages.lineVoltage
                  ? `${gridVoltages.phaseVoltage}V fase / ${gridVoltages.lineVoltage}V linha`
                  : 'Compatível',
            },
          ],
        })
      }
    }

    // --- ITEM 3: Distribuição por faces do telhado ---
    const useRoofFaces = Boolean(neg.use_roof_faces)
    const roofFacesData: Array<{ orientation?: string; modules?: any }> = Array.isArray(
      neg.roof_faces_data,
    )
      ? neg.roof_faces_data
      : []

    if (!useRoofFaces) {
      items.push({
        id: 'faces_distribution',
        title: 'Distribuição por Faces do Telhado',
        category: 'faces',
        status: 'ok',
        summary: 'Orientação padrão adotada (sem divisão específica por múltiplas faces).',
        details:
          'O cálculo considera a perda padrão do sistema (padrão 23% ou perda nominal configurada). Caso a instalação seja dividida em águas diferentes do telhado (ex: Norte, Leste, Oeste), ative "Considerar faces" nos parâmetros avançados do dimensionamento.',
        recommendation:
          'Se o imóvel tiver telhado com orientações divididas, ative o cálculo por faces para obter a geração com precisão por face.',
        metrics: [
          { label: 'Modo de Orientação', value: 'Face única / Perda padrão' },
          { label: 'Total de Módulos', value: `${totalModuleQty} painéis` },
        ],
      })
    } else {
      const faceModulesSum = roofFacesData.reduce((acc, f) => acc + (Number(f.modules) || 0), 0)
      const hasEmptyFace = roofFacesData.some((f) => !f.orientation || Number(f.modules) <= 0)

      if (roofFacesData.length === 0) {
        items.push({
          id: 'faces_distribution',
          title: 'Distribuição por Faces do Telhado',
          category: 'faces',
          status: 'error',
          summary: 'Cálculo por faces está ativo, mas nenhuma face foi adicionada.',
          details:
            'A opção de divisão por faces foi selecionada na negociação, porém nenhuma face e quantidade de módulos foi configurada.',
          recommendation:
            'Acesse a aba "Dimensionamento" > "Parâmetros Avançados" e adicione as faces com a quantidade de módulos em cada uma.',
        })
      } else if (hasEmptyFace) {
        items.push({
          id: 'faces_distribution',
          title: 'Distribuição por Faces do Telhado',
          category: 'faces',
          status: 'warning',
          summary: 'Existem faces configuradas sem orientação ou com zero módulos.',
          details:
            'Algumas linhas da tabela de faces não possuem orientação selecionada ou têm quantidade zerada.',
          recommendation:
            'Remova as linhas vazias ou informe a orientação e a quantidade de módulos correspondente.',
        })
      } else if (faceModulesSum !== totalModuleQty && totalModuleQty > 0) {
        items.push({
          id: 'faces_distribution',
          title: 'Distribuição por Faces do Telhado',
          category: 'faces',
          status: 'warning',
          summary: `Soma das faces (${faceModulesSum}) diverge do total de módulos do kit (${totalModuleQty}).`,
          details: `Há uma diferença de ${Math.abs(faceModulesSum - totalModuleQty)} painel(is). No dimensionamento, a quantidade das faces tem precedência para o cálculo de geração real.`,
          recommendation:
            'Ajuste as quantidades nas faces para totalizar exatamente a quantidade de módulos do kit.',
          metrics: [
            { label: 'Soma nas Faces', value: `${faceModulesSum} painéis` },
            { label: 'Total no Kit', value: `${totalModuleQty} painéis` },
            { label: 'Divergência', value: `${Math.abs(faceModulesSum - totalModuleQty)} painéis` },
          ],
        })
      } else {
        const facesSummary = roofFacesData
          .map((f) => `${f.orientation}: ${f.modules} painéis`)
          .join(', ')

        items.push({
          id: 'faces_distribution',
          title: 'Distribuição por Faces do Telhado',
          category: 'faces',
          status: 'ok',
          summary: `Distribuição perfeita: ${faceModulesSum} módulos distribuídos harmonicamente entre as faces.`,
          details: `Faces ativas: ${facesSummary}. Todas as perdas por azimute foram aplicadas no cálculo da curva de geração.`,
          metrics: [
            { label: 'Total Módulos Distribuídos', value: `${faceModulesSum} painéis` },
            { label: 'Faces Configuradas', value: `${roofFacesData.length}` },
          ],
        })
      }
    }

    // --- ITEM 4: Limites do Inversor (MPPT / Corrente / Tensão CC) ---
    if (populatedInverters.length === 0) {
      items.push({
        id: 'inverter_limits',
        title: 'Limites Elétricos do Inversor (MPPT e Arranjo)',
        category: 'inverter_limits',
        status: 'manual',
        summary: 'Selecione inversores para auditar os limites elétricos.',
        details:
          'Os limites de rastreadores MPPT e correntes máximas dependem dos modelos de inversor escolhidos.',
      })
    } else {
      // Checar se temos os campos de catálogo
      const reports: string[] = []
      let allHaveMppt = true

      for (const inv of populatedInverters) {
        const r = inv.record
        const invName = `${r?.brand || ''} ${r?.name || ''}`.trim() || 'Inversor'
        const mpptCount = r?.mppt ? Number(r.mppt) : null

        if (mpptCount && mpptCount > 0) {
          const totalMppts = mpptCount * (inv.qty || 1)
          const modPerMppt =
            totalMppts > 0 && totalModuleQty > 0 ? (totalModuleQty / totalMppts).toFixed(1) : null

          reports.push(
            `• ${invName} (${inv.qty}x): ${mpptCount} MPPT(s) por unidade. Total: ${totalMppts} rastreador(es). Média estimada: ${modPerMppt || '—'} módulos por MPPT.`,
          )
        } else {
          allHaveMppt = false
          reports.push(
            `• ${invName}: quantidade de MPPT não informada no catálogo (verificar manualmente no datasheet do fabricante).`,
          )
        }
      }

      if (allHaveMppt) {
        items.push({
          id: 'inverter_limits',
          title: 'Limites Elétricos do Inversor (Rastreadores MPPT)',
          category: 'inverter_limits',
          status: 'ok',
          summary: 'Rastreadores MPPT cadastrados no catálogo e disponíveis para o arranjo.',
          details: `${reports.join('\n')}\n\nNota: Corrente máxima CC de curto-circuito (Isc) e tensão máxima Voc devem ser validadas pelo projetista na elaboração do diagrama unifilar.`,
          recommendation:
            'Confira no projeto executivo a divisão das strings entre os MPPTs para não exceder a tensão máxima em vazio (Voc) em dias frios.',
        })
      } else {
        items.push({
          id: 'inverter_limits',
          title: 'Limites Elétricos do Inversor (Corrente / Tensão / MPPT)',
          category: 'inverter_limits',
          status: 'manual',
          summary: 'Dados de rastreador MPPT e corrente CC: verificar manualmente.',
          details: `${reports.join('\n')}\n\nO catálogo deste inversor não possui todos os parâmetros elétricos avançados preenchidos. Em vez de estimar dados inexistentes, o sistema recomenda a conferência manual do datasheet.`,
          recommendation:
            'Abra a ficha técnica do inversor e confira: tensão máxima de entrada CC (Vmax), faixa de operação MPPT e corrente máxima de curto-circuito (Isc).',
        })
      }
    }

    return items
  }, [
    totalDcPowerKwp,
    totalAcPowerKw,
    populatedInverters,
    gridVoltages,
    neg.use_roof_faces,
    neg.roof_faces_data,
    totalModuleQty,
  ])

  // Contadores de status
  const counts = useMemo(() => {
    let ok = 0
    let warning = 0
    let error = 0
    let manual = 0
    for (const it of validationItems) {
      if (it.status === 'ok') ok++
      else if (it.status === 'warning') warning++
      else if (it.status === 'error') error++
      else if (it.status === 'manual') manual++
    }
    return { ok, warning, error, manual, total: validationItems.length }
  }, [validationItems])

  // Copiar resumo para o WhatsApp
  const handleCopySummary = async () => {
    const lines: string[] = []
    lines.push(`⚡ *Elektra CRM — Auditoria de Projeto*`)
    lines.push(`📋 *Negociação:* ${neg.title || 'Sem título'}`)
    if (neg.concessionaire) lines.push(`🏢 *Concessionária:* ${neg.concessionaire}`)
    lines.push(`☀️ *Potência CC:* ${totalDcPowerKwp.toFixed(2)} kWp (${totalModuleQty} módulos)`)
    lines.push(`🔌 *Potência CA:* ${totalAcPowerKw.toFixed(2)} kW`)
    lines.push('')
    lines.push(`*STATUS DA AUDITORIA:*`)

    for (const item of validationItems) {
      const icon =
        item.status === 'ok'
          ? '✅'
          : item.status === 'warning'
            ? '⚠️'
            : item.status === 'error'
              ? '❌'
              : '🔍'
      lines.push(`${icon} *${item.title}*`)
      lines.push(`   ${item.summary}`)
      if (item.recommendation) {
        lines.push(`   👉 _Recomendação: ${item.recommendation}_`)
      }
    }

    lines.push('')
    lines.push(`_Gerado pelo Elektra CRM em ${new Date().toLocaleDateString('pt-BR')}_`)

    const text = lines.join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast({
        title: 'Resumo copiado!',
        description: 'Texto pronto para colar no WhatsApp do cliente ou da equipe técnica.',
      })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar automaticamente para a área de transferência.',
      })
    }
  }

  const getStatusBadge = (status: ValidationStatus) => {
    switch (status) {
      case 'ok':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Conforme
          </Badge>
        )
      case 'warning':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" /> Atenção
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <XCircle className="w-3.5 h-3.5" /> Incompatível
          </Badge>
        )
      case 'manual':
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300 gap-1 text-xs">
            <HelpCircle className="w-3.5 h-3.5" /> Verificar manualmente
          </Badge>
        )
    }
  }

  const getStatusCardBorder = (status: ValidationStatus) => {
    switch (status) {
      case 'ok':
        return 'border-l-4 border-l-emerald-500'
      case 'warning':
        return 'border-l-4 border-l-amber-500'
      case 'error':
        return 'border-l-4 border-l-rose-500'
      case 'manual':
        return 'border-l-4 border-l-slate-400'
    }
  }

  const getCategoryIcon = (cat: ValidationItem['category']) => {
    switch (cat) {
      case 'cc_ca':
        return <Gauge className="w-5 h-5 text-primary" />
      case 'grid_voltage':
        return <Zap className="w-5 h-5 text-amber-500" />
      case 'faces':
        return <Compass className="w-5 h-5 text-sky-500" />
      case 'inverter_limits':
        return <Boxes className="w-5 h-5 text-indigo-500" />
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner de Resumo da Auditoria */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                <CardTitle className="text-xl">Validador de Projeto (Engenharia)</CardTitle>
              </div>
              <CardDescription>
                Checklist automático que audita o dimensionamento solar, compatibilidade de rede e
                distribuição de módulos. Ferramenta de conferência sem bloqueios.
              </CardDescription>
            </div>

            <Button
              onClick={handleCopySummary}
              variant="outline"
              className="gap-2 shrink-0 border-primary/40 text-primary hover:bg-primary/5"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Copiado!' : 'Copiar resumo'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Conforme</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {counts.ok}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Atenção</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {counts.warning}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
              <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">Incompatível</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{counts.error}</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-muted-foreground font-medium">Verificar manualmente</p>
              <p className="text-2xl font-bold text-foreground">{counts.manual}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Itens Auditados */}
      <div className="space-y-4">
        <TooltipProvider>
          {validationItems.map((item) => (
            <Card
              key={item.id}
              className={`transition-all hover:shadow-md ${getStatusCardBorder(item.status)}`}
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {getCategoryIcon(item.category)}
                    <h3 className="font-semibold text-base text-foreground">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {getStatusBadge(item.status)}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground p-1 rounded-full"
                          aria-label="Ver explicação técnica"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{item.details}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <p className="text-sm font-medium text-foreground">{item.summary}</p>

                <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                  {item.details}
                </p>

                {item.recommendation && (
                  <div className="text-xs rounded-lg p-2.5 bg-muted/50 border border-border/60 flex items-start gap-2">
                    <span className="font-semibold text-primary shrink-0">Recomendação:</span>
                    <span className="text-foreground">{item.recommendation}</span>
                  </div>
                )}

                {item.metrics && item.metrics.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                    {item.metrics.map((m, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-muted/60 text-muted-foreground font-medium"
                      >
                        <span>{m.label}:</span>
                        <strong className="text-foreground">{m.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TooltipProvider>
      </div>
    </div>
  )
}
export default ProjectValidatorTab
