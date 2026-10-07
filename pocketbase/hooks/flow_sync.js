// Router: CRM -> Elektra Flow synchronization
// POST /backend/v1/flow-sync
//
// NOTE (PocketBase JSVM constraint): PocketBase runs callbacks in a separate VM pool.
// Top-level variables and functions referenced inside callbacks cause deployment failure.
// All helper logic MUST be declared inside the callback body.

routerAdd(
  'POST',
  '/backend/v1/flow-sync',
  (e) => {
    try {
      const user = e.auth
      if (!user) {
        return e.json(401, { success: false, message: 'Não autorizado.' })
      }

      const userCompanyId = user.getString('company_id')
      const userRole = user.getString('role')
      const isElektraAdmin = userRole === 'User_elektra'

      let body = {}
      try {
        const reqInfo = e.requestInfo ? e.requestInfo() : null
        body = (reqInfo && reqInfo.body) || {}
      } catch (_) {
        body = {}
      }

      const negotiationId = (body.negotiation_id || body.id || '').trim()
      if (!negotiationId) {
        return e.json(400, { success: false, message: 'ID da negociação é obrigatório.' })
      }

      // 1. Carregar negociação com validação de tenant
      let neg = null
      try {
        neg = $app.findRecordById('negotiations', negotiationId)
      } catch (_) {
        return e.json(404, { success: false, message: 'Negociação não encontrada.' })
      }

      const negCompanyId = neg.getString('company_id')
      if (!isElektraAdmin && userCompanyId && negCompanyId !== userCompanyId) {
        return e.json(403, {
          success: false,
          message: 'Você não tem permissão para acessar esta negociação.',
        })
      }

      // 2. Carregar a Empresa (owner_email = companies.email)
      let company = null
      if (negCompanyId) {
        try {
          company = $app.findRecordById('companies', negCompanyId)
        } catch (_) {}
      }

      let ownerEmail = ''
      if (company) {
        ownerEmail = (company.getString('email') || '').trim()
      }
      // Se companies.email não estiver preenchido, fallback para o e-mail do usuário autenticado
      if (!ownerEmail && user.email) {
        try {
          ownerEmail = (user.email() || '').trim()
        } catch (_) {}
      }
      if (!ownerEmail) {
        ownerEmail = (user.getString('email') || '').trim()
      }

      if (!ownerEmail) {
        return e.json(400, {
          success: false,
          message:
            'A empresa vinculada não possui e-mail cadastrado (companies.email). Atualize os dados da empresa antes de enviar ao Flow.',
        })
      }

      // 3. Carregar o Lead (dados do cliente)
      let lead = null
      const leadId = neg.getString('lead_id')
      if (leadId) {
        try {
          lead = $app.findRecordById('leads', leadId)
        } catch (_) {}
      }

      // Extração de sizing
      let sizing = {}
      try {
        const rawSizing = neg.get('sizing')
        if (typeof rawSizing === 'string') {
          sizing = JSON.parse(rawSizing)
        } else if (rawSizing && typeof rawSizing === 'object') {
          sizing = rawSizing
        }
      } catch (_) {
        sizing = {}
      }

      const addrStruct = (sizing && typeof sizing === 'object' && sizing.address_struct) || {}

      // Resolver dados do cliente
      const clientName = (lead ? lead.getString('name') : '') || neg.getString('title') || 'Cliente'
      const clientDoc = (lead ? lead.getString('document') : '') || ''
      const clientEmail = (lead ? lead.getString('email') : '') || ''
      const clientPhone = (lead ? lead.getString('phone') : '') || ''

      const cleanDocDigits = clientDoc.replace(/\D/g, '')
      const clientType = cleanDocDigits.length > 11 ? 'PJ' : 'PF'

      const addressStreet =
        (lead && lead.getString('address')) || addrStruct.street || neg.getString('address') || ''
      const addressNumber =
        (lead && lead.getString('number')) || addrStruct.number || neg.getString('number') || ''
      const addressNeighborhood =
        (lead && lead.getString('neighborhood')) ||
        addrStruct.neighborhood ||
        neg.getString('neighborhood') ||
        ''
      const addressCity =
        (lead && lead.getString('city')) || addrStruct.city || neg.getString('city') || ''
      const addressState =
        (lead && lead.getString('state')) || addrStruct.state || neg.getString('state') || ''
      const addressCep =
        (lead && lead.getString('cep')) ||
        addrStruct.zip ||
        addrStruct.cep ||
        neg.getString('cep') ||
        ''

      const clientPayload = {
        name: clientName,
        documento: clientDoc,
        email: clientEmail,
        phone: clientPhone,
        address: addressStreet,
        number: addressNumber,
        neighborhood: addressNeighborhood,
        city: addressCity,
        state: addressState,
        cep: addressCep,
        type: clientType,
      }

      // 4. Módulos e inversores selecionados
      const modulesList = []
      const invertersList = []

      // Módulo
      const selectedModId = sizing.selected_module_id || sizing.moduleId || ''
      const moduleQty = Number(
        sizing.module_qty !== undefined && sizing.module_qty !== null
          ? sizing.module_qty
          : sizing.modules_count || 0,
      )
      let modulePowerW = Number(sizing.module_power || sizing.power_w || 0)
      let moduleName = sizing.module_model || sizing.moduleName || ''

      if (selectedModId) {
        try {
          const modRec = $app.findRecordById('pv_modules', selectedModId)
          if (modRec) {
            const brand = (modRec.getString('brand') || '').trim()
            const name = (modRec.getString('name') || '').trim()
            moduleName = (brand ? brand + ' ' : '') + name
            if (!modulePowerW) {
              modulePowerW = Number(modRec.get('power') || 0)
            }
          }
        } catch (_) {}
      }

      if (moduleQty > 0 || modulePowerW > 0 || moduleName) {
        modulesList.push({
          name: moduleName || 'Módulo Solar',
          power_w: modulePowerW || 0,
          quantity: moduleQty || 0,
        })
      }

      // Inversores
      const rawInverters =
        Array.isArray(sizing.inverters) && sizing.inverters.length > 0
          ? sizing.inverters
          : sizing.selected_inverter_id
            ? [{ id: sizing.selected_inverter_id, qty: 1 }]
            : []

      for (let i = 0; i < rawInverters.length; i++) {
        const item = rawInverters[i]
        if (!item) continue
        const invId = item.id
        const invQty = Number(item.qty || item.quantity || 1)
        let invPowerKw = Number(item.power || 0)
        let invName = item.name || ''

        if (invId) {
          try {
            const invRec = $app.findRecordById('pv_inverters', invId)
            if (invRec) {
              const brand = (invRec.getString('brand') || '').trim()
              const name = (invRec.getString('name') || '').trim()
              invName = (brand ? brand + ' ' : '') + name
              if (!invPowerKw) {
                invPowerKw = Number(invRec.get('power') || 0)
              }
            }
          } catch (_) {}
        }

        if (invName || invPowerKw > 0) {
          invertersList.push({
            name: invName || 'Inversor Solar',
            power_kw: invPowerKw || 0,
            quantity: invQty || 1,
          })
        }
      }

      // Potência CC
      let powerDcKwp = 0
      if (moduleQty > 0 && modulePowerW > 0) {
        powerDcKwp = (moduleQty * modulePowerW) / 1000
      } else if (sizing.system_power_kwp) {
        powerDcKwp = Number(sizing.system_power_kwp) || 0
      } else if (sizing.kit_power_kwp) {
        powerDcKwp = Number(sizing.kit_power_kwp) || 0
      } else if (sizing.totalPower) {
        powerDcKwp = Number(sizing.totalPower) || 0
      }
      powerDcKwp = Number(powerDcKwp.toFixed(2))

      // Potência CA (soma dos inversores)
      let powerAcKw = 0
      for (let k = 0; k < invertersList.length; k++) {
        powerAcKw += (invertersList[k].power_kw || 0) * (invertersList[k].quantity || 1)
      }
      powerAcKw = Number(powerAcKw.toFixed(2))

      // 5. Valor da negociação
      // Buscar propostas da negociação ordenadas por data
      let dealValue = 0
      try {
        const props = $app.findRecordsByFilter(
          'proposals',
          "negotiation_id = '" + negotiationId + "'",
          '-created',
          20,
        )
        if (props && props.length > 0) {
          // Procura proposta aceita/ganha primeiro
          let acceptedProp = null
          for (let p = 0; p < props.length; p++) {
            const st = (props[p].getString('status') || '').toLowerCase()
            if (st === 'accepted' || st === 'aprovada' || st === 'ganho') {
              acceptedProp = props[p]
              break
            }
          }
          const chosenProp = acceptedProp || props[0]
          dealValue = Number(chosenProp.get('total_value') || chosenProp.get('price') || 0)
        }
      } catch (_) {}

      if (!dealValue && sizing.total_price) {
        dealValue = Number(sizing.total_price) || 0
      }
      if (!dealValue && sizing.kit_price) {
        dealValue = Number(sizing.kit_price) || 0
      }

      // 6. Dados elétricos e concessionária
      const ucNumber = (neg.getString('uc') || '').trim()
      const ucSupplyType = (
        neg.getString('consumer_category') ||
        sizing.consumer_category ||
        sizing.consumer_class ||
        'Residencial'
      ).trim()
      const ucServiceType = (sizing.network_type || '').trim()
      const ucVoltage = (sizing.tension || sizing.voltage || '').trim()

      // 7. Unidades beneficiárias (uc_beneficiaries)
      let ucBeneficiariesRaw = []
      try {
        const rawUcB = neg.get('uc_beneficiaries')
        if (typeof rawUcB === 'string') {
          ucBeneficiariesRaw = JSON.parse(rawUcB)
        } else if (Array.isArray(rawUcB)) {
          ucBeneficiariesRaw = rawUcB
        }
      } catch (_) {
        ucBeneficiariesRaw = []
      }

      const ucBeneficiaries = []
      if (Array.isArray(ucBeneficiariesRaw)) {
        for (let b = 0; b < ucBeneficiariesRaw.length; b++) {
          const item = ucBeneficiariesRaw[b]
          if (item && item.name && typeof item.name === 'string' && item.name.trim().length > 0) {
            ucBeneficiaries.push({
              name: item.name.trim(),
              percentage: Number(item.percentage) || 0,
            })
          }
        }
      }

      // 8. SITE_URL do CRM para crm_deal_url
      let siteUrl = ''
      try {
        siteUrl = $secrets.get('SITE_URL') || ''
      } catch (_) {}
      if (!siteUrl) {
        try {
          siteUrl = $os.getenv('SITE_URL') || ''
        } catch (_) {}
      }
      if (!siteUrl) {
        siteUrl = 'https://crm.elektrasolucoes.tech'
      }
      if (siteUrl.endsWith('/')) {
        siteUrl = siteUrl.slice(0, -1)
      }
      const crmDealUrl = siteUrl + '/negotiations/' + negotiationId

      // 9. Montar payload do projeto
      const projectPayload = {
        name: neg.getString('title') || 'Projeto Solar',
        crm_deal_id: negotiationId,
        crm_deal_url: crmDealUrl,
        power_kwp: powerDcKwp,
        power_dc_kwp: powerDcKwp,
        power_ac_kw: powerAcKw,
        value: Number(dealValue.toFixed(2)),
        uc_number: ucNumber,
        uc_supply_type: ucSupplyType,
        uc_service_type: ucServiceType,
        uc_voltage: ucVoltage,
        solar_kit: {
          modules: modulesList,
          inverters: invertersList,
        },
      }

      if (ucBeneficiaries.length > 0) {
        projectPayload.uc_beneficiaries = ucBeneficiaries
      }

      const flowPayload = {
        action: 'deal_won',
        owner_email: ownerEmail,
        client: clientPayload,
        project: projectPayload,
      }

      console.log('[flow-sync] enviando payload:', JSON.stringify(flowPayload))
      $app
        .logger()
        .info(
          'flow-sync disparado',
          'negotiation_id',
          negotiationId,
          'owner_email',
          ownerEmail,
          'payload',
          JSON.stringify(flowPayload),
        )

      // 10. Obter secret ELEKTRA_FLOW_CRM
      let flowSecret = ''
      try {
        flowSecret = $secrets.get('ELEKTRA_FLOW_CRM') || ''
      } catch (_) {}
      if (!flowSecret) {
        try {
          flowSecret = $os.getenv('ELEKTRA_FLOW_CRM') || ''
        } catch (_) {}
      }
      if (flowSecret) flowSecret = flowSecret.trim()

      if (!flowSecret) {
        $app.logger().error('ELEKTRA_FLOW_CRM secret não configurado no servidor')
        return e.json(500, {
          success: false,
          message:
            'Chave de autenticação com o Elektra Flow não configurada no servidor (ELEKTRA_FLOW_CRM).',
        })
      }

      // 11. Disparar para o endpoint interno do Flow
      // URL interna obrigatória shrd00 (NUNCA domínio público)
      const flowEndpoint =
        'https://elektra-flow-c0abd.shrd00.internal.goskip.dev/backend/v1/crm-deal-sync'

      let flowRes = null
      try {
        flowRes = $http.send({
          url: flowEndpoint,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Secret': flowSecret,
            Authorization: 'Bearer ' + flowSecret,
          },
          body: JSON.stringify(flowPayload),
          timeout: 25,
        })
      } catch (httpErr) {
        $app
          .logger()
          .error('Falha de rede ao conectar com o Elektra Flow', 'error', String(httpErr))
        return e.json(502, {
          success: false,
          message:
            'Não foi possível conectar ao servidor do Elektra Flow. Verifique a conectividade interna: ' +
            String(httpErr.message || httpErr),
        })
      }

      console.log(
        '[flow-sync] resposta status:',
        flowRes ? flowRes.statusCode : 'null',
        'body:',
        flowRes ? JSON.stringify(flowRes.json || flowRes.body) : 'null',
      )

      $app.logger().info('Resposta do Elektra Flow recebida', {
        statusCode: flowRes ? flowRes.statusCode : null,
        body: flowRes ? flowRes.json || flowRes.body : null,
      })

      if (!flowRes) {
        return e.json(502, {
          success: false,
          message: 'Sem resposta do Elektra Flow.',
        })
      }

      const resBody = flowRes.json || {}
      if (flowRes.statusCode >= 400) {
        const errorMsg =
          resBody.message ||
          resBody.error ||
          (typeof flowRes.body === 'string' ? flowRes.body : 'Erro retornado pelo Flow')
        return e.json(flowRes.statusCode, {
          success: false,
          message: 'O Elektra Flow recusou a sincronização: ' + errorMsg,
          flow_status: flowRes.statusCode,
          flow_response: resBody,
        })
      }

      return e.json(200, {
        success: true,
        message: 'Projeto sincronizado com sucesso no Elektra Flow.',
        flow_response: resBody,
        payload_sent: flowPayload,
      })
    } catch (err) {
      $app.logger().error('Exceção inesperada no flow-sync', 'error', String(err))
      return e.json(500, {
        success: false,
        message: 'Erro interno ao processar sincronização: ' + String(err.message || err),
      })
    }
  },
  $apis.requireAuth(),
)
