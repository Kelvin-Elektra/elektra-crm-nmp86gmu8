routerAdd(
  'POST',
  '/backend/v1/proposals/generate-external',
  (e) => {
    try {
      function safeLogInfo(msg, data) {
        try {
          if (data !== undefined) {
            $app.logger().info(msg, 'data', typeof data === 'string' ? data : JSON.stringify(data))
          } else {
            $app.logger().info(msg)
          }
        } catch (_) {}
      }

      function safeLogWarn(msg, data) {
        try {
          if (data !== undefined) {
            $app.logger().warn(msg, 'data', typeof data === 'string' ? data : JSON.stringify(data))
          } else {
            $app.logger().warn(msg)
          }
        } catch (_) {}
      }

      function safeLogError(msg, data) {
        try {
          if (data !== undefined) {
            $app.logger().error(msg, 'data', typeof data === 'string' ? data : JSON.stringify(data))
          } else {
            $app.logger().error(msg)
          }
        } catch (_) {}
      }

      // Função auxiliar para sanitizar headers para log
      function sanitizeHeadersForLog(headers) {
        const sanitized = {}
        if (!headers || typeof headers !== 'object') return sanitized
        for (const h of Object.keys(headers)) {
          const hLower = h.toLowerCase()
          if (
            hLower.indexOf('secret') !== -1 ||
            hLower.indexOf('auth') !== -1 ||
            hLower.indexOf('token') !== -1 ||
            hLower.indexOf('key') !== -1
          ) {
            sanitized[h] = '[REDACTED]'
          } else {
            sanitized[h] = headers[h]
          }
        }
        return sanitized
      }

      // Função auxiliar para construir headers de autenticação conforme o contrato
      function resolveAuthHeaders(authConfig, secretValue) {
        const headers = {}
        if (!authConfig) {
          if (secretValue) {
            headers['x-api-secret'] = secretValue
          }
          return headers
        }

        if (typeof authConfig === 'string') {
          const lower = authConfig.toLowerCase().trim()
          if (lower === 'bearer' || lower === 'authorization' || lower.startsWith('bearer')) {
            headers['Authorization'] = 'Bearer ' + secretValue
          } else if (lower === 'x-api-secret' || lower === 'api-secret') {
            headers['x-api-secret'] = secretValue
          } else if (lower === 'x-api-key' || lower === 'api-key') {
            headers['x-api-key'] = secretValue
          } else {
            headers[authConfig] = secretValue
          }
          return headers
        }

        if (typeof authConfig === 'object' && authConfig !== null) {
          if (authConfig.headers && typeof authConfig.headers === 'object') {
            for (const k of Object.keys(authConfig.headers)) {
              let v = authConfig.headers[k]
              if (
                typeof v === 'string' &&
                (v === '{secret}' || v === ':secret' || v === '$secret')
              ) {
                v = secretValue
              } else if (typeof v === 'string' && v.indexOf('{secret}') !== -1) {
                v = v.replace('{secret}', secretValue)
              }
              headers[k] = v
            }
          } else if (authConfig.type) {
            const t = String(authConfig.type).toLowerCase()
            const headerName =
              authConfig.header || (t === 'bearer' ? 'Authorization' : 'x-api-secret')
            if (t === 'bearer') {
              headers[headerName] = 'Bearer ' + secretValue
            } else {
              headers[headerName] = secretValue
            }
          } else if (authConfig.header) {
            headers[authConfig.header] = secretValue
          }
        }

        // Se nada foi preenchido, usa fallback padrão
        if (Object.keys(headers).length === 0 && secretValue) {
          headers['x-api-secret'] = secretValue
        }

        return headers
      }

      let generatorUrl = ''
      let generatorPublicUrl = ''
      try {
        const record = $app.findFirstRecordByFilter('system_settings', 'id != ""')
        if (record) {
          generatorUrl = record.getString('generator_url')
          generatorPublicUrl = record.getString('generator_public_url')
        }
      } catch (settingsErr) {
        safeLogWarn('Aviso ao buscar system_settings', String(settingsErr))
      }

      // Buscar empresa e proposal_settings com dynamic_mappings
      let companyId = ''
      try {
        if (e.auth) {
          companyId = e.auth.getString('company_id') || ''
        }
      } catch (_) {}

      // Se body tiver negotiation_id ou external_id, podemos conferir a empresa da negociação/proposta caso e.auth não tenha
      if (!companyId && body.external_id) {
        try {
          const propRec = $app.findFirstRecordByFilter(
            'proposals',
            "id = '" + body.external_id + "'",
          )
          if (propRec) companyId = propRec.getString('company_id') || ''
        } catch (_) {}
      }

      let manualDynamicMappings = {}
      if (companyId) {
        try {
          const pSettings = $app.findFirstRecordByFilter(
            'proposal_settings',
            "company_id = '" + companyId + "'",
          )
          if (pSettings) {
            let dm = pSettings.get('dynamic_mappings')
            if (typeof dm === 'string') {
              try {
                dm = JSON.parse(dm)
              } catch (_) {}
            }
            if (dm && typeof dm === 'object') {
              // Se tiver chave por template_id: dm[templateId]
              if (dm[templateId] && typeof dm[templateId] === 'object') {
                manualDynamicMappings = dm[templateId]
              } else if (!dm[templateId] && !dm['default']) {
                // Caso seja mapa plano direto ou contenha o template
                manualDynamicMappings = dm
              }
            }
          }
        } catch (settingsFetchErr) {
          safeLogWarn(
            'Aviso ao buscar dynamic_mappings em proposal_settings',
            String(settingsFetchErr),
          )
        }
      }

      if (!generatorUrl) {
        return e.json(500, {
          message: 'URL do Gerador não configurada nas configurações do sistema.',
        })
      }

      if (generatorUrl.endsWith('/')) {
        generatorUrl = generatorUrl.slice(0, -1)
      }
      if (!generatorPublicUrl) {
        generatorPublicUrl = generatorUrl
      }
      if (generatorPublicUrl.endsWith('/')) {
        generatorPublicUrl = generatorPublicUrl.slice(0, -1)
      }

      let apiSecret = ''
      try {
        apiSecret = $secrets.get('API_CRM_GERADOR') || ''
      } catch (secErr) {
        try {
          apiSecret = $os.getenv('API_CRM_GERADOR') || ''
        } catch (_) {}
      }

      let body = {}
      try {
        const reqInfo = e.requestInfo ? e.requestInfo() : null
        body = (reqInfo && reqInfo.body) || {}
      } catch (bodyErr) {
        safeLogWarn('Aviso ao ler request body via requestInfo', String(bodyErr))
        body = {}
      }

      const templateId = body.template_id
      const externalId = body.external_id

      if (!templateId) {
        return e.json(400, { message: 'template_id é obrigatório.' })
      }
      if (!externalId) {
        return e.json(400, { message: 'external_id é obrigatório.' })
      }

      // 1. Ler o contract dinamicamente do endpoint GET /backend/v1/templates/list
      let createEndpoint = '/backend/v1/proposals'
      let createMethod = 'POST'
      let activeBaseUrl = generatorUrl
      let proposalAuthConfig = null
      let listRes = null

      try {
        listRes = $http.send({
          url: generatorUrl + '/backend/v1/templates/list',
          method: 'GET',
          headers: {
            'x-api-secret': apiSecret,
          },
          timeout: 10,
        })

        if (listRes.statusCode === 200 && listRes.json && listRes.json.contract) {
          const contract = listRes.json.contract

          safeLogInfo('Contrato recebido do Gerador', contract)

          // Base URL dinâmica vinda do contract (se declarada)
          if (contract.base_url && typeof contract.base_url === 'string') {
            let bUrl = contract.base_url.trim()
            if (bUrl.endsWith('/')) {
              bUrl = bUrl.slice(0, -1)
            }
            if (bUrl.startsWith('http://') || bUrl.startsWith('https://')) {
              activeBaseUrl = bUrl
            }
          }

          // Auth declarada no nível do contract
          if (contract.auth) {
            proposalAuthConfig = contract.auth
          }

          if (contract.create_proposal) {
            // Auth específica de create_proposal sobrepõe auth geral do contract
            if (contract.create_proposal.auth) {
              proposalAuthConfig = contract.create_proposal.auth
            }

            if (contract.create_proposal.method) {
              createMethod = String(contract.create_proposal.method).toUpperCase()
            }

            if (contract.create_proposal.endpoint) {
              let ep = String(contract.create_proposal.endpoint).trim()
              if (ep.indexOf(' ') !== -1) {
                const parts = ep.split(/\s+/)
                if (parts.length >= 2) {
                  createMethod = parts[0].toUpperCase()
                  ep = parts[1]
                }
              }
              createEndpoint = ep
            }
          }
        }
      } catch (listErr) {
        safeLogWarn(
          'Aviso: Não foi possível obter contract atualizado antes da criação de proposta, usando fallback padrão',
          String(listErr),
        )
      }

      // 1 & 2. Normalização de endpoint e validação de URL final
      let finalUrl = ''
      if (createEndpoint.startsWith('http://') || createEndpoint.startsWith('https://')) {
        finalUrl = createEndpoint
      } else {
        if (createEndpoint.charAt(0) !== '/') {
          createEndpoint = '/' + createEndpoint
        }
        if (activeBaseUrl.startsWith('http://') || activeBaseUrl.startsWith('https://')) {
          finalUrl = activeBaseUrl + createEndpoint
        } else {
          finalUrl = generatorUrl + createEndpoint
        }
      }

      // 2. Montar payload estritamente no padrão do contract:
      // payload_shape: ["template_id", "external_id", "fixed_data", "lead", "negotiation", "sizing", "financial"]
      let rawFixedData = body.fixed_data || {}
      if (
        typeof listRes !== 'undefined' &&
        listRes &&
        listRes.json &&
        Array.isArray(listRes.json.templates)
      ) {
        const matchingTpl = listRes.json.templates.find((t) => t.id === templateId)
        if (
          matchingTpl &&
          matchingTpl.variable_schema &&
          Array.isArray(matchingTpl.variable_schema.fixed)
        ) {
          const schemaKeys = matchingTpl.variable_schema.fixed.map((f) => f.key)
          const filteredFixedData = {}
          for (const k of schemaKeys) {
            if (rawFixedData[k] !== undefined) {
              filteredFixedData[k] = rawFixedData[k]
            }
          }
          rawFixedData = filteredFixedData
        }
      }

      // =========================================================================
      // MAPEADOR SEMÂNTICO DE VARIÁVEIS DINÂMICAS DO CONTRATO EXTERNO
      // =========================================================================
      function normalizeSemanticStr(str) {
        if (!str || typeof str !== 'string') return ''
        var s = str.trim().toLowerCase()
        s = s
          .replace(/[áàâãä]/g, 'a')
          .replace(/[éèêë]/g, 'e')
          .replace(/[íìîï]/g, 'i')
          .replace(/[óòôõö]/g, 'o')
          .replace(/[úùûü]/g, 'u')
          .replace(/[ç]/g, 'c')
          .replace(/[ñ]/g, 'n')
        s = s.replace(/[\-_.:\/\\()\[\]]/g, ' ')
        s = s.replace(/\s+/g, ' ').trim()
        return s
      }

      var SEMANTIC_STOPWORDS = {
        de: true,
        do: true,
        da: true,
        dos: true,
        das: true,
        em: true,
        no: true,
        na: true,
        nos: true,
        nas: true,
        para: true,
        por: true,
        com: true,
        of: true,
        in: true,
        on: true,
        for: true,
        with: true,
        at: true,
        to: true,
        o: true,
        a: true,
        os: true,
        as: true,
        um: true,
        uma: true,
        uns: true,
        umas: true,
        the: true,
        an: true,
      }

      function getSemanticTokenList(str) {
        var norm = normalizeSemanticStr(str)
        if (!norm) return []
        var rawTokens = norm.split(' ')
        var tokens = []
        for (var i = 0; i < rawTokens.length; i++) {
          var t = rawTokens[i]
          if (t && !SEMANTIC_STOPWORDS[t]) {
            tokens.push(t)
          }
        }
        return tokens
      }

      // Função auxiliar para resolução de caminhos com dot-notation (ex: financial.total_investment, sizing.kit_power_kwp)
      function getValueByPath(obj, path) {
        if (!obj || !path || typeof path !== 'string') return undefined
        var parts = path.split('.')
        var curr = obj
        for (var pi = 0; pi < parts.length; pi++) {
          var p = parts[pi]
          if (curr === null || curr === undefined || typeof curr !== 'object') return undefined
          curr = curr[p]
        }
        return curr
      }

      const rawLead = body.lead || {}
      const leadDoc = rawLead.document || rawLead.cpf_cnpj || rawLead.cpf || rawLead.cnpj || ''
      const leadPhone = rawLead.phone || rawLead.whatsapp || rawLead.telefone || ''
      const leadName = rawLead.name || rawLead.client_name || 'Cliente'
      const leadEmail = rawLead.email || ''
      const leadAddress = rawLead.address || rawLead.endereco || ''

      const rawNegotiation = body.negotiation || {}
      const rawSizing = body.sizing || {}
      const rawFinancial = body.financial || {}

      // Resolver nome do consultor responsável
      let consultantName = rawNegotiation.consultant_name || rawNegotiation.seller_name || ''
      let proposalNumber = rawNegotiation.proposal_number || externalId || ''
      let proposalDate = rawNegotiation.proposal_date || ''
      let proposalCreatedRaw = null

      if (externalId) {
        try {
          const propRec = $app.findFirstRecordByFilter('proposals', "id = '" + externalId + "'")
          if (propRec) {
            proposalCreatedRaw = propRec.getString('created')
            const negId = propRec.getString('negotiation_id') || rawNegotiation.id
            if (negId) {
              const negRec = $app.findFirstRecordByFilter('negotiations', "id = '" + negId + "'")
              if (negRec) {
                const ownerId = negRec.getString('owner_id')
                if (ownerId && !consultantName) {
                  try {
                    const userRec = $app.findFirstRecordByFilter('users', "id = '" + ownerId + "'")
                    if (userRec) {
                      consultantName = userRec.getString('name') || ''
                    }
                  } catch (_) {}
                }
                // Se avg_consumption da negociação tiver valor e sizing não tiver
                if (!rawSizing.avg_consumption && negRec.getInt('avg_consumption')) {
                  rawSizing.avg_consumption = negRec.getInt('avg_consumption')
                }
              }
            }
          }
        } catch (_) {}
      }

      if (!consultantName && e.auth) {
        consultantName = e.auth.getString('name') || ''
      }
      if (!consultantName) {
        consultantName = 'Consultor Elektra'
      }

      // Formatar proposal_date (dd/mm/aaaa)
      if (!proposalDate) {
        const dObj = proposalCreatedRaw ? new Date(proposalCreatedRaw) : new Date()
        const dayStr = String(dObj.getDate()).padStart(2, '0')
        const monStr = String(dObj.getMonth() + 1).padStart(2, '0')
        const yearStr = dObj.getFullYear()
        proposalDate = dayStr + '/' + monStr + '/' + yearStr
      }

      // Extração robusta de dias de validade (NÚMERO DE DIAS)
      function parseValidityDays(rawVal, baseCreated) {
        if (rawVal === undefined || rawVal === null || rawVal === '') return 10
        if (typeof rawVal === 'number' && rawVal > 0) return Math.round(rawVal)
        var s = String(rawVal).trim()
        var mNum = s.match(/^(\d+)\s*(?:dias?|d)?$/i)
        if (mNum) {
          var n = parseInt(mNum[1], 10)
          if (n > 0) return n
        }
        var mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
        if (mIso) {
          var tDate = new Date(s)
          var bDate = baseCreated ? new Date(baseCreated) : new Date()
          if (!isNaN(tDate.getTime()) && !isNaN(bDate.getTime())) {
            var diff = Math.round((tDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24))
            if (diff > 0) return diff
          }
        }
        var mBr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
        if (mBr) {
          var d = parseInt(mBr[1], 10)
          var m = parseInt(mBr[2], 10) - 1
          var y = parseInt(mBr[3], 10)
          var tDate2 = new Date(y, m, d)
          var bDate2 = baseCreated ? new Date(baseCreated) : new Date()
          if (!isNaN(tDate2.getTime()) && !isNaN(bDate2.getTime())) {
            var diff2 = Math.round((tDate2.getTime() - bDate2.getTime()) / (1000 * 60 * 60 * 24))
            if (diff2 > 0) return diff2
          }
        }
        var mAny = s.match(/(\d+)/)
        if (mAny) {
          var c = parseInt(mAny[1], 10)
          if (c > 0 && c <= 365) return c
        }
        return 10
      }

      const rawValidityVal =
        rawNegotiation.validity_days !== undefined
          ? rawNegotiation.validity_days
          : rawNegotiation.validity || rawNegotiation.validity_date || ''
      const validityDays = parseValidityDays(rawValidityVal, proposalCreatedRaw)

      // Extração robusta de geração estimada (kwh) com fallback
      const kitPower = Number(rawSizing.kit_power_kwp || rawSizing.power_kwp || rawSizing.kwp || 0)
      let estGen = Number(
        rawSizing.estimated_monthly_generation ||
          rawSizing.monthly_generation ||
          rawSizing.generation_kwh ||
          0,
      )

      if (estGen <= 0) {
        var monthsList = [
          'jan',
          'feb',
          'mar',
          'apr',
          'may',
          'jun',
          'jul',
          'aug',
          'sep',
          'oct',
          'nov',
          'dec',
        ]
        var mSum = 0
        var mCount = 0
        for (var mi = 0; mi < monthsList.length; mi++) {
          var mVal = Number(rawSizing[monthsList[mi]])
          if (!isNaN(mVal) && mVal > 0) {
            mSum += mVal
            mCount++
          }
        }
        if (mCount > 0) {
          estGen = Number((mSum / mCount).toFixed(1))
        } else if (kitPower > 0) {
          // Fallback potência * HSP(4.5) * 30 * 0.8
          estGen = Number((kitPower * 4.5 * 30 * 0.8).toFixed(1))
        }
      }

      const avgCons = Number(
        rawSizing.avg_consumption ||
          rawSizing.average_consumption ||
          rawSizing.monthly_consumption ||
          rawSizing.consumption_kwh ||
          rawNegotiation.avg_consumption ||
          0,
      )

      const modQty = Number(
        rawSizing.module_qty || rawSizing.module_quantity || rawSizing.modules_count || 0,
      )

      // 7. Cobertura do consumo (%)
      let consumptionCoveragePct = 0
      if (avgCons > 0 && estGen > 0) {
        consumptionCoveragePct = Number(((estGen / avgCons) * 100).toFixed(1))
      }

      // 8. Área ocupada (m²)
      let moduleUnitArea = 2.58 // padrão ~2.58 m²
      const selectedModId = rawSizing.selected_module_id || ''
      if (selectedModId) {
        try {
          const modRec = $app.findFirstRecordByFilter('pv_modules', "id = '" + selectedModId + "'")
          if (modRec) {
            let h = modRec.getFloat('height') || 0
            let w = modRec.getFloat('width') || 0
            if (h > 10) h = h / 1000
            if (w > 10) w = w / 1000
            if (h > 0 && w > 0) {
              moduleUnitArea = h * w
            }
          }
        } catch (_) {}
      }
      const occupiedAreaM2 = modQty > 0 ? Number((moduleUnitArea * modQty).toFixed(1)) : 0

      // Financeiro e novos cálculos
      const totInv = Number(
        rawFinancial.total_investment ||
          rawFinancial.investment ||
          rawFinancial.price ||
          rawFinancial.total_value ||
          rawFinancial.sale_price ||
          0,
      )
      const monSav = Number(
        rawFinancial.monthly_savings ||
          rawFinancial.economy_monthly ||
          rawFinancial.estimated_monthly_savings ||
          0,
      )
      const pbYears = Number(
        rawFinancial.payback_years !== undefined
          ? rawFinancial.payback_years
          : rawFinancial.payback !== undefined
            ? rawFinancial.payback
            : 0,
      )
      const pbMonths = Number(
        rawFinancial.payback_months !== undefined
          ? rawFinancial.payback_months
          : pbYears
            ? Math.round(pbYears * 12)
            : 0,
      )
      const annSav = Number(
        rawFinancial.annual_savings !== undefined
          ? rawFinancial.annual_savings
          : rawFinancial.yearly_savings !== undefined
            ? rawFinancial.yearly_savings
            : monSav * 12,
      )

      // 12. Economia 25 anos (R$) - garantia de consistência
      const sav25y = Number(
        rawFinancial.savings_25_years !== undefined
          ? rawFinancial.savings_25_years
          : rawFinancial.total_savings_25y !== undefined
            ? rawFinancial.total_savings_25y
            : annSav * 25,
      )

      // 9. CO2 evitado (toneladas/ano): geração mensal * 12 * 0.0385 / 1000
      const BRAZIL_GRID_EMISSION_FACTOR = 0.0000385
      const co2AvoidedTon =
        estGen > 0 ? Number((estGen * 12 * BRAZIL_GRID_EMISSION_FACTOR).toFixed(2)) : 0

      // 10. Múltiplo do investimento: savings_25_years ÷ total_investment
      let investmentMultiple = 0
      if (totInv > 0 && sav25y > 0) {
        investmentMultiple = Number((sav25y / totInv).toFixed(1))
      }

      // 11. TIR anual (%) via bisseção sobre fluxo: -totInv no ano 0, annSav nos anos 1..25
      function calcTirBisect(I0, S, years) {
        if (!I0 || I0 <= 0 || !S || S <= 0) return 0
        if (S * years <= I0) return 0
        function vpl(r) {
          if (r === 0) return S * years - I0
          return -I0 + (S * (1 - Math.pow(1 + r, -years))) / r
        }
        var low = 0.0001
        var high = 5.0
        while (vpl(high) > 0 && high < 50.0) {
          high *= 2
        }
        if (vpl(low) < 0) return 0
        for (var it = 0; it < 100; it++) {
          var mid = (low + high) / 2
          var vm = vpl(mid)
          if (Math.abs(vm) < 1e-6 || (high - low) / 2 < 1e-6) {
            return Number((mid * 100).toFixed(1))
          }
          if (vm > 0) low = mid
          else high = mid
        }
        return Number((((low + high) / 2) * 100).toFixed(1))
      }
      const tirPct = calcTirBisect(totInv, annSav, 25)

      const tariffDetails = rawFinancial.tariff_details || {}
      const tariffRate = Number(
        tariffDetails.total ||
          (Number(tariffDetails.te) || 0) + (Number(tariffDetails.tusd) || 0) ||
          0,
      )

      // Contexto canônico com dados normalizados
      const semanticContext = {
        lead: {
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          whatsapp: leadPhone,
          document: leadDoc,
          cpf_cnpj: leadDoc,
          address: leadAddress,
          city: rawLead.city || rawSizing.city || '',
          state: rawLead.state || rawSizing.state || '',
        },
        negotiation: {
          id: rawNegotiation.id || '',
          title: rawNegotiation.title || '',
          validity: rawNegotiation.validity || rawNegotiation.validity_date || '',
          validity_date: rawNegotiation.validity_date || rawNegotiation.validity || '',
          validity_days: validityDays,
          consultant_name: consultantName,
          proposal_number: proposalNumber,
          proposal_date: proposalDate,
          payment_terms: rawNegotiation.payment_terms || '',
          defined_payment_method: rawNegotiation.defined_payment_method || '',
          accepted_payment_methods: rawNegotiation.accepted_payment_methods || '',
          installation_lead_time: rawNegotiation.installation_lead_time || '',
          notes: rawNegotiation.notes || '',
          description: rawNegotiation.description || '',
        },
        sizing: {
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
          inverters: rawSizing.inverters || [],
          consumer_category: rawSizing.consumer_category || '',
          simultaneity_factor: rawSizing.simultaneity_factor || 0,
          network_type: rawSizing.network_type || rawSizing.grid_type || '',
          roof_type: rawSizing.roof_type || rawSizing.structure_type || '',
          concessionaire: rawSizing.concessionaire || rawSizing.distributor || '',
        },
        financial: {
          total_investment: totInv,
          investment: totInv,
          price: totInv,
          total_value: totInv,
          sale_price: totInv,
          subtotal: rawFinancial.subtotal !== undefined ? rawFinancial.subtotal : totInv,
          discount_amount:
            rawFinancial.discount_amount !== undefined ? rawFinancial.discount_amount : 0,
          monthly_savings: monSav,
          economy_monthly: monSav,
          estimated_monthly_savings: monSav,
          payback_years: pbYears,
          payback_months: pbMonths,
          payback: pbYears,
          annual_savings: annSav,
          yearly_savings: annSav,
          savings_25_years: sav25y,
          total_savings_25y: sav25y,
          investment_multiple: investmentMultiple,
          tir_pct: tirPct,
          co2_avoided_ton: co2AvoidedTon,
          tariff_details: tariffDetails,
          tariff_rate: tariffRate,
          tariff_te: Number(tariffDetails.te || 0),
          tariff_tusd: Number(tariffDetails.tusd || 0),
        },
      }

      // Catálogo Semântico Centralizado
      const SEMANTIC_CONCEPTS = [
        {
          concept: 'kit_power',
          targetCategory: 'sizing',
          targetField: 'kit_power_kwp',
          synonyms: [
            'kit power kwp',
            'kit power',
            'power kwp',
            'power',
            'potencia kit',
            'potencia instalada',
            'potencia do kit',
            'potencia',
            'kwp',
            'system size',
            'tamanho sistema',
            'potencia sistema',
            'potencia gerador',
            'kit potencia',
          ],
          keywords: ['potencia', 'kwp', 'power'],
          negativeKeywords: [
            'geracao',
            'generation',
            'producao',
            'consumo',
            'consumption',
            'inversor',
            'modulo',
          ],
        },
        {
          concept: 'module_qty',
          targetCategory: 'sizing',
          targetField: 'module_qty',
          synonyms: [
            'module qty',
            'module quantity',
            'modules count',
            'module count',
            'modules qty',
            'qtd modulos',
            'quantidade modulos',
            'numero modulos',
            'quant modulos',
            'qtd paineis',
            'quantidade paineis',
            'numero paineis',
            'quant paineis',
            'paineis solares',
            'modulos solares',
            'total modulos',
            'total paineis',
            'modulos',
            'paineis',
            'panels',
            'modules',
          ],
          keywords: [
            'modulo',
            'modulos',
            'painel',
            'paineis',
            'module',
            'modules',
            'panel',
            'panels',
          ],
          negativeKeywords: ['potencia', 'kwp', 'inversor', 'inverter'],
        },

        {
          concept: 'consumption',
          targetCategory: 'sizing',
          targetField: 'avg_consumption',
          synonyms: [
            'avg consumption',
            'average consumption',
            'average monthly consumption',
            'average monthly consumption kwh',
            'monthly consumption',
            'consumption kwh',
            'consumo medio',
            'consumo medio mensal',
            'consumo mensal',
            'consumo kwh',
            'consumo',
            'gasto energetico',
            'demanda energia',
            'consumo energia',
            'energy consumption',
            'monthly energy',
            'consumo medio kwh',
            'consumo medio mensal kwh',
          ],
          keywords: ['consumo', 'consumption', 'gasto'],
          negativeKeywords: ['geracao', 'generation', 'economia', 'savings', 'producao'],
        },
        {
          concept: 'generation',
          targetCategory: 'sizing',
          targetField: 'estimated_monthly_generation',
          synonyms: [
            'estimated monthly generation',
            'monthly generation',
            'generation kwh',
            'estimated generation',
            'estimated generation kwh',
            'generation estimated kwh',
            'geracao estimada',
            'geracao estimada kwh',
            'geracao media',
            'geracao media mensal',
            'geracao mensal',
            'geracao kwh',
            'geracao',
            'producao estimada',
            'producao mensal',
            'producao energia',
            'estimated production',
            'energy generation',
            'solar generation',
            'geracao solar',
            'geracao mensal estimada kwh',
          ],
          keywords: ['geracao', 'generation', 'producao', 'production'],
          negativeKeywords: ['consumo', 'consumption', 'potencia', 'kwp'],
        },
        {
          concept: 'consumption_coverage',
          targetCategory: 'sizing',
          targetField: 'consumption_coverage_pct',
          synonyms: [
            'consumption coverage pct',
            'consumption coverage',
            'coverage pct',
            'coverage',
            'cobertura consumo pct',
            'cobertura consumo',
            'cobertura percentual',
            'cobertura',
            'percentual cobertura',
            'taxa cobertura',
            'cobertura demanda',
            'energy coverage',
          ],
          keywords: ['cobertura', 'coverage'],
          negativeKeywords: ['area'],
        },
        {
          concept: 'occupied_area',
          targetCategory: 'sizing',
          targetField: 'occupied_area_m2',
          synonyms: [
            'occupied area m2',
            'occupied area',
            'area m2',
            'area',
            'area ocupada m2',
            'area ocupada',
            'area necessaria',
            'area instalacao',
            'area modulos',
            'area paineis',
            'area total modulos',
            'tamanho area',
            'required area',
            'installation area',
          ],
          keywords: ['area', 'ocupada', 'm2'],
          negativeKeywords: ['cobertura', 'co2'],
        },
        {
          concept: 'co2_avoided',
          targetCategory: 'financial',
          targetField: 'co2_avoided_ton',
          synonyms: [
            'co2 avoided ton',
            'co2 avoided',
            'co2 evitado ton',
            'co2 evitado',
            'co2 evitado toneladas',
            'emissoes evitadas',
            'toneladas co2',
            'co2 tons',
            'co2',
            'carbon avoided',
            'carbon offset',
            'reducao co2',
            'carbono evitado',
          ],
          keywords: ['co2', 'carbono', 'carbon', 'evitado'],
          negativeKeywords: [],
        },
        {
          concept: 'investment_multiple',
          targetCategory: 'financial',
          targetField: 'investment_multiple',
          synonyms: [
            'investment multiple',
            'multiplo investimento',
            'multiplo do investimento',
            'multiplo',
            'multiplicador investimento',
            'multiplo retorno',
            'multiple',
            'roi multiple',
          ],
          keywords: ['multiplo', 'multiple'],
          negativeKeywords: ['tir', 'irr'],
        },
        {
          concept: 'tir_pct',
          targetCategory: 'financial',
          targetField: 'tir_pct',
          synonyms: [
            'tir pct',
            'tir',
            'taxa interna retorno',
            'taxa interna de retorno',
            'irr pct',
            'irr',
            'internal rate return',
            'internal rate of return',
            'retorno tir',
            'tir anual',
          ],
          keywords: ['tir', 'irr', 'retorno'],
          negativeKeywords: ['payback', 'meses', 'tempo'],
        },
        {
          concept: 'consultant_name',
          targetCategory: 'negotiation',
          targetField: 'consultant_name',
          synonyms: [
            'consultant name',
            'consultant',
            'seller name',
            'seller',
            'salesperson',
            'representative',
            'consultor',
            'nome consultor',
            'nome do consultor',
            'vendedor',
            'nome vendedor',
            'nome do vendedor',
            'responsavel',
            'consultor comercial',
          ],
          keywords: ['consultor', 'vendedor', 'consultant', 'seller'],
          negativeKeywords: ['cliente', 'client'],
        },
        {
          concept: 'proposal_number',
          targetCategory: 'negotiation',
          targetField: 'proposal_number',
          synonyms: [
            'proposal number',
            'proposal code',
            'proposal id',
            'numero proposta',
            'codigo proposta',
            'num proposta',
            'nro proposta',
            'numero da proposta',
            'codigo da proposta',
          ],
          keywords: ['proposta', 'numero', 'codigo'],
          negativeKeywords: ['validade', 'data', 'consultor'],
        },
        {
          concept: 'proposal_date',
          targetCategory: 'negotiation',
          targetField: 'proposal_date',
          synonyms: [
            'proposal date',
            'creation date',
            'issue date',
            'data proposta',
            'data da proposta',
            'data emissao',
            'data de emissao',
            'data criacao',
          ],
          keywords: ['data', 'emissao', 'criacao'],
          negativeKeywords: ['validade', 'validity', 'prazo'],
        },
        {
          concept: 'validity_days',
          targetCategory: 'negotiation',
          targetField: 'validity_days',
          synonyms: [
            'validity days',
            'validity in days',
            'dias validade',
            'validade dias',
            'prazo validade dias',
            'validade em dias',
            'dias de validade',
            'numero dias validade',
          ],
          keywords: ['validade', 'dias'],
          negativeKeywords: [],
        },
        {
          concept: 'total_investment',
          targetCategory: 'financial',
          targetField: 'total_investment',
          synonyms: [
            'total investment',
            'investment total',
            'investment',
            'sale price',
            'price',
            'total value',
            'value total',
            'valor total',
            'investimento total',
            'total investimento',
            'investimento',
            'preco venda',
            'preco total',
            'preco',
            'valor sistema',
            'custo total',
            'total cost',
            'system price',
            'valor da proposta',
            'valor proposta',
            'valor total investimento',
          ],
          keywords: ['investimento', 'investment', 'preco', 'price'],
          negativeKeywords: ['economia', 'savings', 'mensal', 'payback', 'retorno'],
        },
        {
          concept: 'monthly_savings',
          targetCategory: 'financial',
          targetField: 'monthly_savings',
          synonyms: [
            'monthly savings',
            'estimated monthly savings',
            'economy monthly',
            'savings monthly',
            'economia mensal',
            'economia estimada',
            'economia media mensal',
            'economia mes',
            'economia',
            'estimated savings',
            'monthly economy',
          ],
          keywords: ['economia', 'savings', 'economy'],
          negativeKeywords: ['25', '25 anos', 'anual', 'annual', 'yearly', 'total'],
        },
        {
          concept: 'savings_25_years',
          targetCategory: 'financial',
          targetField: 'savings_25_years',
          synonyms: [
            'savings 25 years',
            'total savings 25y',
            'savings 25y',
            'total savings',
            'economia 25 anos',
            'economia 25y',
            'economia total 25 anos',
            'economia acumulada',
            'economia 25',
            '25 years savings',
            'savings 25',
          ],
          keywords: ['25', 'acumulada'],
          negativeKeywords: ['mensal', 'anual'],
        },
        {
          concept: 'annual_savings',
          targetCategory: 'financial',
          targetField: 'annual_savings',
          synonyms: [
            'annual savings',
            'yearly savings',
            'economia anual',
            'economia ano',
            'annual economy',
            'yearly economy',
          ],
          keywords: ['anual', 'annual', 'yearly', 'ano'],
          negativeKeywords: ['mensal', '25'],
        },
        {
          concept: 'payback_years',
          targetCategory: 'financial',
          targetField: 'payback_years',
          synonyms: [
            'payback years',
            'payback',
            'tempo retorno',
            'prazo retorno',
            'retorno investimento',
            'payback anos',
            'anos retorno',
            'tempo de retorno',
            'retorno',
          ],
          keywords: ['payback', 'retorno'],
          negativeKeywords: ['meses', 'months'],
        },
        {
          concept: 'payback_months',
          targetCategory: 'financial',
          targetField: 'payback_months',
          synonyms: [
            'payback months',
            'payback meses',
            'tempo retorno meses',
            'retorno meses',
            'meses retorno',
          ],
          keywords: ['payback', 'retorno'],
          negativeKeywords: [],
        },
        {
          concept: 'tariff',
          targetCategory: 'financial',
          targetField: 'tariff_rate',
          synonyms: [
            'tariff rate',
            'tariff',
            'tarifa',
            'tarifa energia',
            'valor tarifa',
            'tarifa concessionaria',
            'energy tariff',
            'tariff value',
          ],
          keywords: ['tarifa', 'tariff'],
          negativeKeywords: [],
        },
        {
          concept: 'lead_name',
          targetCategory: 'lead',
          targetField: 'name',
          synonyms: [
            'client name',
            'customer name',
            'lead name',
            'client',
            'customer',
            'lead',
            'nome cliente',
            'cliente',
            'nome do cliente',
            'nome titular',
            'titular',
            'nome consumidor',
            'consumidor',
          ],
          keywords: ['cliente', 'client', 'customer', 'titular', 'consumidor'],
          negativeKeywords: ['empresa', 'company'],
        },
        {
          concept: 'lead_document',
          targetCategory: 'lead',
          targetField: 'document',
          synonyms: [
            'client document',
            'document',
            'cpf cnpj',
            'cpf',
            'cnpj',
            'documento cliente',
            'documento titular',
            'doc titular',
            'cpf titular',
            'cnpj titular',
            'identificacao',
          ],
          keywords: ['cpf', 'cnpj', 'documento', 'document'],
          negativeKeywords: [],
        },
        {
          concept: 'lead_phone',
          targetCategory: 'lead',
          targetField: 'phone',
          synonyms: [
            'phone',
            'whatsapp',
            'telephone',
            'mobile',
            'celular',
            'telefone',
            'telefone cliente',
            'whatsapp cliente',
            'contato cliente',
            'contato',
          ],
          keywords: ['telefone', 'phone', 'whatsapp', 'celular', 'contato'],
          negativeKeywords: [],
        },
        {
          concept: 'lead_email',
          targetCategory: 'lead',
          targetField: 'email',
          synonyms: [
            'email',
            'client email',
            'customer email',
            'e mail',
            'email cliente',
            'e mail cliente',
            'correio eletronico',
          ],
          keywords: ['email', 'mail'],
          negativeKeywords: [],
        },
        {
          concept: 'address',
          targetCategory: 'lead',
          targetField: 'address',
          synonyms: [
            'address',
            'endereco',
            'full address',
            'endereco completo',
            'local instalacao',
            'endereco instalacao',
            'installation address',
            'localizacao',
          ],
          keywords: ['endereco', 'address', 'instalacao', 'local'],
          negativeKeywords: [],
        },
        {
          concept: 'city',
          targetCategory: 'lead',
          targetField: 'city',
          synonyms: ['city', 'cidade', 'municipio'],
          keywords: ['cidade', 'city', 'municipio'],
          negativeKeywords: [],
        },
        {
          concept: 'state',
          targetCategory: 'lead',
          targetField: 'state',
          synonyms: ['state', 'estado', 'uf'],
          keywords: ['estado', 'state', 'uf'],
          negativeKeywords: [],
        },
        {
          concept: 'validity',
          targetCategory: 'negotiation',
          targetField: 'validity',
          synonyms: [
            'validity',
            'validity date',
            'validade',
            'data validade',
            'validade proposta',
            'prazo validade',
            'expiration date',
          ],
          keywords: ['validade', 'validity'],
          negativeKeywords: [],
        },
        {
          concept: 'installation_lead_time',
          targetCategory: 'negotiation',
          targetField: 'installation_lead_time',
          synonyms: [
            'installation lead time',
            'lead time',
            'prazo instalacao',
            'prazo execucao',
            'tempo instalacao',
            'tempo execucao',
            'delivery time',
          ],
          keywords: ['prazo', 'lead time'],
          negativeKeywords: ['validade'],
        },
        {
          concept: 'payment_terms',
          targetCategory: 'negotiation',
          targetField: 'payment_terms',
          synonyms: [
            'payment terms',
            'condicoes pagamento',
            'forma pagamento',
            'condicao pagamento',
            'formas pagamento aceitas',
            'pagamento',
            'payment method',
            'defined payment method',
          ],
          keywords: ['pagamento', 'payment'],
          negativeKeywords: [],
        },
        {
          concept: 'concessionaire',
          targetCategory: 'sizing',
          targetField: 'concessionaire',
          synonyms: [
            'concessionaire',
            'distributor',
            'distribuidora',
            'concessionaria',
            'concessionaria energia',
            'utility company',
          ],
          keywords: ['concessionaria', 'distribuidora', 'utility'],
          negativeKeywords: [],
        },
        {
          concept: 'consumer_category',
          targetCategory: 'sizing',
          targetField: 'consumer_category',
          synonyms: [
            'consumer category',
            'categoria consumo',
            'categoria consumidor',
            'tipo consumidor',
            'classe consumo',
            'consumer type',
          ],
          keywords: ['categoria', 'classe'],
          negativeKeywords: [],
        },
      ]

      function resolveSemanticValue(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') return { resolved: false }
        var normKey = normalizeSemanticStr(rawKey)
        var keyTokens = getSemanticTokenList(rawKey)

        // (a) Correspondência exata em qualquer categoria
        var cats = ['lead', 'sizing', 'financial', 'negotiation']
        for (var ci = 0; ci < cats.length; ci++) {
          var cName = cats[ci]
          var cObj = semanticContext[cName]
          if (cObj && cObj[rawKey] !== undefined && cObj[rawKey] !== null && cObj[rawKey] !== '') {
            return {
              resolved: true,
              category: cName,
              field: rawKey,
              value: cObj[rawKey],
              matchType: 'exact_key',
            }
          }
        }

        // (b) Correspondência semântica via sinônimos
        for (var si = 0; si < SEMANTIC_CONCEPTS.length; si++) {
          var sc = SEMANTIC_CONCEPTS[si]
          for (var yi = 0; yi < sc.synonyms.length; yi++) {
            if (normKey === normalizeSemanticStr(sc.synonyms[yi])) {
              var val = semanticContext[sc.targetCategory]
                ? semanticContext[sc.targetCategory][sc.targetField]
                : undefined
              if (val !== undefined && val !== null && val !== '') {
                return {
                  resolved: true,
                  category: sc.targetCategory,
                  field: sc.targetField,
                  value: val,
                  matchType: 'semantic_synonym',
                }
              }
            }
          }
        }

        // (c) Correspondência semântica por ordem de tokens (ex: "total_investment" = "investment_total")
        var sortedKey = keyTokens.slice().sort().join(' ')
        for (var ti = 0; ti < SEMANTIC_CONCEPTS.length; ti++) {
          var tc = SEMANTIC_CONCEPTS[ti]
          for (var ty = 0; ty < tc.synonyms.length; ty++) {
            var synTokens = getSemanticTokenList(tc.synonyms[ty])
            if (sortedKey === synTokens.slice().sort().join(' ') && sortedKey.length > 0) {
              var valT = semanticContext[tc.targetCategory]
                ? semanticContext[tc.targetCategory][tc.targetField]
                : undefined
              if (valT !== undefined && valT !== null && valT !== '') {
                return {
                  resolved: true,
                  category: tc.targetCategory,
                  field: tc.targetField,
                  value: valT,
                  matchType: 'semantic_token_order',
                }
              }
            }
          }
        }

        // (d) Correspondência por palavras-chave com penalização de palavras negativas
        var bestMatch = null
        var bestScore = 0
        for (var ki = 0; ki < SEMANTIC_CONCEPTS.length; ki++) {
          var kc = SEMANTIC_CONCEPTS[ki]
          var hasNeg = false
          for (var ni = 0; ni < kc.negativeKeywords.length; ni++) {
            if (normKey.indexOf(kc.negativeKeywords[ni]) !== -1) {
              hasNeg = true
              break
            }
          }
          if (hasNeg) continue

          var score = 0
          for (var kwi = 0; kwi < kc.keywords.length; kwi++) {
            if (normKey.indexOf(kc.keywords[kwi]) !== -1) score++
          }

          if (score > 0 && score > bestScore) {
            var valK = semanticContext[kc.targetCategory]
              ? semanticContext[kc.targetCategory][kc.targetField]
              : undefined
            if (valK !== undefined && valK !== null && valK !== '') {
              bestScore = score
              bestMatch = {
                resolved: true,
                category: kc.targetCategory,
                field: kc.targetField,
                value: valK,
                matchType: 'semantic_keyword',
              }
            }
          }
        }

        if (bestMatch) return bestMatch
        return { resolved: false }
      }

      // Inicializa enriquecimento base com aliases padrão
      const enrichedLead = Object.assign({}, semanticContext.lead, rawLead)
      const enrichedSizing = Object.assign({}, semanticContext.sizing, rawSizing)
      const enrichedFinancial = Object.assign({}, semanticContext.financial, rawFinancial)
      const enrichedNegotiation = Object.assign({}, semanticContext.negotiation, rawNegotiation)

      // Se houver variable_schema.dynamic no contrato, processa cada variável
      var templateDynamicSchema = null
      if (
        typeof listRes !== 'undefined' &&
        listRes &&
        listRes.json &&
        Array.isArray(listRes.json.templates)
      ) {
        var currentTpl = listRes.json.templates.find((t) => t.id === templateId)
        if (currentTpl && currentTpl.variable_schema && currentTpl.variable_schema.dynamic) {
          templateDynamicSchema = currentTpl.variable_schema.dynamic
        }
      }

      var dynamicKeysToResolve = []
      if (Array.isArray(templateDynamicSchema)) {
        for (var di = 0; di < templateDynamicSchema.length; di++) {
          var dItem = templateDynamicSchema[di]
          var dKey = typeof dItem === 'string' ? dItem : dItem.key || dItem.name || ''
          if (dKey) dynamicKeysToResolve.push(dKey)
        }
      } else if (templateDynamicSchema && typeof templateDynamicSchema === 'object') {
        dynamicKeysToResolve = Object.keys(templateDynamicSchema)
      }

      // Raiz completa de dados da negociação para suporte a dot-notation manual
      const crmDataRoot = {
        lead: enrichedLead,
        negotiation: enrichedNegotiation,
        sizing: enrichedSizing,
        financial: enrichedFinancial,
        raw: {
          lead: rawLead,
          negotiation: rawNegotiation,
          sizing: rawSizing,
          financial: rawFinancial,
        },
      }

      var resolvedReport = {}
      var unresolvedReport = []

      for (var ri = 0; ri < dynamicKeysToResolve.length; ri++) {
        var kToRes = dynamicKeysToResolve[ri]
        var manualPath = manualDynamicMappings ? manualDynamicMappings[kToRes] : null

        // 1. Ordem de resolução: Mapeamento Manual do ADM (se configurado e não vazio)
        var manualValue = undefined
        if (manualPath && typeof manualPath === 'string' && manualPath.trim() !== '') {
          var pClean = manualPath.trim()
          manualValue = getValueByPath(crmDataRoot, pClean)
          if (manualValue === undefined) {
            manualValue = getValueByPath(semanticContext, pClean)
          }
          if (manualValue === undefined) {
            // Tenta nos objetos individuais
            manualValue =
              getValueByPath(enrichedFinancial, pClean) ||
              getValueByPath(enrichedSizing, pClean) ||
              getValueByPath(enrichedLead, pClean) ||
              getValueByPath(enrichedNegotiation, pClean)
          }

          if (manualValue !== undefined && manualValue !== null && manualValue !== '') {
            resolvedReport[kToRes] = {
              category: 'manual',
              field: pClean,
              matchType: 'manual_override',
              value: manualValue,
            }
            // Enriquecer todas as categorias do payload para o template
            enrichedLead[kToRes] = manualValue
            enrichedSizing[kToRes] = manualValue
            enrichedFinancial[kToRes] = manualValue
            enrichedNegotiation[kToRes] = manualValue
            continue
          }
        }

        // 2 & 3. Correspondência Exata e Mapeador Semântico Automático
        var resObj = resolveSemanticValue(kToRes)
        if (resObj.resolved) {
          resolvedReport[kToRes] = {
            category: resObj.category,
            field: resObj.field,
            matchType: resObj.matchType,
            value: resObj.value,
          }
          if (resObj.category === 'lead') enrichedLead[kToRes] = resObj.value
          else if (resObj.category === 'sizing') enrichedSizing[kToRes] = resObj.value
          else if (resObj.category === 'financial') enrichedFinancial[kToRes] = resObj.value
          else if (resObj.category === 'negotiation') enrichedNegotiation[kToRes] = resObj.value
        } else {
          unresolvedReport.push(kToRes)
        }
      }

      // Log seguro das variáveis dinâmicas resolvidas e não resolvidas
      safeLogInfo('Relatório de Mapeamento Semântico de Variáveis Dinâmicas', {
        template_id: templateId,
        total_dynamic: dynamicKeysToResolve.length,
        resolved_count: Object.keys(resolvedReport).length,
        unresolved_count: unresolvedReport.length,
        resolved: resolvedReport,
        unresolved: unresolvedReport,
      })

      const payload = {
        template_id: templateId,
        external_id: externalId,
        fixed_data: rawFixedData,
        lead: enrichedLead,
        negotiation: enrichedNegotiation,
        sizing: enrichedSizing,
        financial: enrichedFinancial,
      }
      let bodyStr = '{}'
      try {
        bodyStr = JSON.stringify(payload)
      } catch (_) {}

      const authHeaders = resolveAuthHeaders(proposalAuthConfig, apiSecret)
      const requestHeaders = Object.assign({}, authHeaders, {
        'Content-Type': 'application/json; charset=utf-8',
      })

      safeLogInfo('Disparando chamada de criação de proposta para o Gerador (tentativa 1)', {
        url: finalUrl,
        method: createMethod,
        headers: sanitizeHeadersForLog(requestHeaders),
      })

      let res
      try {
        res = $http.send({
          url: finalUrl,
          method: createMethod,
          headers: requestHeaders,
          body: bodyStr,
          timeout: 30,
        })
      } catch (err) {
        safeLogWarn(
          'Falha na chamada de criação via URL derivada do contract, tentando fallback com URL fixa',
          {
            error: String(err),
            url: finalUrl,
          },
        )

        // 3. Retry com fallback: caminho fixo sabidamente acessível
        const fallbackUrl = generatorUrl + '/backend/v1/proposals'
        const fallbackHeaders = {
          'Content-Type': 'application/json; charset=utf-8',
        }
        if (apiSecret) {
          fallbackHeaders['x-api-secret'] = apiSecret
        }

        safeLogInfo(
          'Disparando chamada de criação de proposta para o Gerador (tentativa 2 - fallback)',
          {
            url: fallbackUrl,
            method: 'POST',
            headers: sanitizeHeadersForLog(fallbackHeaders),
          },
        )

        try {
          res = $http.send({
            url: fallbackUrl,
            method: 'POST',
            headers: fallbackHeaders,
            body: bodyStr,
            timeout: 30,
          })
        } catch (fallbackErr) {
          safeLogError(
            'Falha ao conectar com o Gerador de Propostas (create_proposal) após fallback',
            {
              error_tentativa_1: String(err),
              url_tentativa_1: finalUrl,
              error_tentativa_2: String(fallbackErr),
              url_tentativa_2: fallbackUrl,
            },
          )
          return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
        }
      }

      // 2 (c) e 3: Tratar erro >= 400 com log do corpo cru e propagação fiel ao frontend
      if (res.statusCode >= 400) {
        let rawBody = ''
        try {
          if (typeof res.raw === 'string') {
            rawBody = res.raw
          } else if (res.json) {
            rawBody = JSON.stringify(res.json)
          } else if (res.body) {
            rawBody = String(res.body)
          }
        } catch (_) {
          rawBody = String(res.body || '')
        }

        safeLogError('Gerador retornou erro na criação de proposta', {
          status: res.statusCode,
          raw_body: rawBody,
          template_id: templateId,
          external_id: externalId,
        })

        // Se a resposta for JSON estruturado válido, devolve o corpo completo do Gerador
        if (res.json && typeof res.json === 'object' && Object.keys(res.json).length > 0) {
          return e.json(res.statusCode, res.json)
        }

        // Se não for JSON válido ou estiver vazio
        return e.json(res.statusCode, {
          message: 'Erro do Gerador (status ' + res.statusCode + ')',
          detail: rawBody || 'Nenhum detalhe retornado pelo gerador.',
        })
      }

      const result = res.json || {}
      if (result && result.view_url) {
        let viewUrl = String(result.view_url)
        // Reescrever domínio para generatorPublicUrl preservando path e query
        if (viewUrl.indexOf('http://') === 0 || viewUrl.indexOf('https://') === 0) {
          try {
            const slashIdx = viewUrl.indexOf('/', 8) // após https:// ou http://
            const pathAndQuery = slashIdx !== -1 ? viewUrl.substring(slashIdx) : ''
            result.view_url = generatorPublicUrl + pathAndQuery
          } catch (_) {
            result.view_url = viewUrl
          }
        } else {
          if (viewUrl.charAt(0) !== '/') {
            viewUrl = '/' + viewUrl
          }
          result.view_url = generatorPublicUrl + viewUrl
        }
      }

      if (e.response && e.response.header) {
        try {
          e.response.header().set('Content-Type', 'application/json; charset=utf-8')
        } catch (_) {}
      }

      return e.json(200, result)
    } catch (globalErr) {
      try {
        $app
          .logger()
          .error('Exceção não capturada no handler generate-external', 'error', String(globalErr))
      } catch (_) {}
      return e.json(500, {
        message: 'Erro interno ao gerar proposta.',
        detail: String(globalErr),
      })
    }
  },
  $apis.requireAuth(),
)
