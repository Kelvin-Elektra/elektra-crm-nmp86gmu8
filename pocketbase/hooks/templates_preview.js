routerAdd(
  'POST',
  '/backend/v1/templates/{templateId}/preview',
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

      const templateId = e.request ? e.request.pathValue('templateId') : ''
      if (!templateId) {
        return e.json(400, { message: 'templateId é obrigatório.' })
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
        safeLogWarn('Aviso ao buscar system_settings (preview)', String(settingsErr))
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

        if (Object.keys(headers).length === 0 && secretValue) {
          headers['x-api-secret'] = secretValue
        }

        return headers
      }

      // 1. Obter o contract do Gerador dinamicamente
      let targetEndpoint = '/backend/v1/templates/' + templateId + '/preview'
      let targetMethod = 'POST'
      let activeBaseUrl = generatorUrl
      let previewAuthConfig = null
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

          safeLogInfo('Contrato recebido do Gerador (preview)', contract)

          if (contract.base_url && typeof contract.base_url === 'string') {
            let bUrl = contract.base_url.trim()
            if (bUrl.endsWith('/')) {
              bUrl = bUrl.slice(0, -1)
            }
            if (bUrl.startsWith('http://') || bUrl.startsWith('https://')) {
              activeBaseUrl = bUrl
            }
          }

          if (contract.auth) {
            previewAuthConfig = contract.auth
          }

          if (contract.preview_proposal) {
            if (contract.preview_proposal.auth) {
              previewAuthConfig = contract.preview_proposal.auth
            }

            if (contract.preview_proposal.method) {
              targetMethod = String(contract.preview_proposal.method).toUpperCase()
            }

            if (contract.preview_proposal.endpoint) {
              let ep = String(contract.preview_proposal.endpoint).trim()
              // Extrair método se vier como "POST /endpoint"
              if (ep.indexOf(' ') !== -1) {
                const parts = ep.split(/\s+/)
                if (parts.length >= 2) {
                  targetMethod = parts[0].toUpperCase()
                  ep = parts[1]
                }
              }
              // Substituir {id} ou :id ou {templateId}
              targetEndpoint = ep
                .replace('{id}', templateId)
                .replace(':id', templateId)
                .replace('{templateId}', templateId)
            }
          }
        }
      } catch (listErr) {
        safeLogWarn(
          'Aviso: Não foi possível obter contract atualizado antes do preview, usando fallback padrão',
          String(listErr),
        )
      }

      // Normalização de endpoint e validação de URL final
      let finalUrl = ''
      if (targetEndpoint.startsWith('http://') || targetEndpoint.startsWith('https://')) {
        finalUrl = targetEndpoint
      } else {
        if (targetEndpoint.charAt(0) !== '/') {
          targetEndpoint = '/' + targetEndpoint
        }
        if (activeBaseUrl.startsWith('http://') || activeBaseUrl.startsWith('https://')) {
          finalUrl = activeBaseUrl + targetEndpoint
        } else {
          finalUrl = generatorUrl + targetEndpoint
        }
      }

      let body = {}
      try {
        const reqInfo = e.requestInfo ? e.requestInfo() : null
        body = (reqInfo && reqInfo.body) || {}
      } catch (bodyErr) {
        safeLogWarn('Aviso ao ler request body no preview', String(bodyErr))
        body = {}
      }

      // Buscar contexto da empresa e proposal_settings do usuário autenticado
      let companyId = ''
      try {
        if (e.auth) {
          companyId = e.auth.getString('company_id') || ''
        }
      } catch (_) {}

      let savedTemplateConfig = {}
      let companyFallbackData = {}

      if (companyId) {
        // 1. Tentar ler proposal_settings da empresa
        try {
          const settingsRec = $app.findFirstRecordByFilter(
            'proposal_settings',
            "company_id = '" + companyId + "'",
          )
          if (settingsRec) {
            let tplConfigs = {}
            try {
              tplConfigs = settingsRec.get('templates_config') || {}
              if (typeof tplConfigs === 'string') {
                tplConfigs = JSON.parse(tplConfigs)
              }
            } catch (_) {
              tplConfigs = {}
            }

            if (tplConfigs && typeof tplConfigs === 'object' && tplConfigs[templateId]) {
              savedTemplateConfig = tplConfigs[templateId]
            } else if (settingsRec.get('branding')) {
              let br = settingsRec.get('branding')
              if (typeof br === 'string') {
                try {
                  br = JSON.parse(br)
                } catch (_) {}
              }
              if (br && typeof br === 'object') {
                companyFallbackData = Object.assign({}, companyFallbackData, br)
              }
            }
          }
        } catch (settingsErr) {
          safeLogWarn(
            'Aviso ao buscar proposal_settings da empresa para preview',
            String(settingsErr),
          )
        }

        // 2. Carregar dados da empresa como base de fallback
        try {
          const compRec = $app.findFirstRecordByFilter('companies', "id = '" + companyId + "'")
          if (compRec) {
            let logoUrl = ''
            const logoFile = compRec.getString('logo')
            if (logoFile) {
              try {
                logoUrl = $app.fileUrl(compRec, logoFile)
              } catch (_) {}
            }
            const compName = compRec.getString('name') || ''
            const compCnpj = compRec.getString('cnpj') || ''
            companyFallbackData = Object.assign(
              {
                company_name: compName,
                name: compName,
                cnpj: compCnpj,
                logo: logoUrl,
                company_logo: logoUrl,
              },
              companyFallbackData,
            )
          }
        } catch (compErr) {
          safeLogWarn('Aviso ao buscar company para fallback de preview', String(compErr))
        }
      }

      // Prioridade dos dados fixos:
      // 1. body.fixed_data explícito enviado pelo cliente
      // 2. savedTemplateConfig salvo em proposal_settings.templates_config[templateId]
      // 3. companyFallbackData (branding / dados da empresa)
      let incomingFixedData = body.fixed_data
      if (incomingFixedData === undefined && body.branding !== undefined) {
        incomingFixedData = body.branding
      }

      let rawFixedData = {}
      if (
        incomingFixedData &&
        typeof incomingFixedData === 'object' &&
        Object.keys(incomingFixedData).length > 0
      ) {
        // O cliente enviou dados — combinamos com os salvos / fallback para eventuais campos ausentes
        rawFixedData = Object.assign(
          {},
          companyFallbackData,
          savedTemplateConfig,
          incomingFixedData,
        )
      } else if (savedTemplateConfig && Object.keys(savedTemplateConfig).length > 0) {
        rawFixedData = Object.assign({}, companyFallbackData, savedTemplateConfig)
      } else {
        rawFixedData = Object.assign({}, companyFallbackData)
      }

      // Se tiver schema dinâmico obtido do listRes, filtramos estritamente pelas chaves do schema
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
      // MAPEADOR SEMÂNTICO DE VARIÁVEIS DINÂMICAS PARA PREVIEW
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

      // Dados de mock/preview inteligentes vindos do template, do body ou valores padrão realistas
      var matchingTplPreview = null
      if (
        typeof listRes !== 'undefined' &&
        listRes &&
        listRes.json &&
        Array.isArray(listRes.json.templates)
      ) {
        matchingTplPreview = listRes.json.templates.find((t) => t.id === templateId)
      }

      var previewMock = (matchingTplPreview && matchingTplPreview.mock_data) || {}
      var bodyLead = body.lead || previewMock.lead || {}
      var bodyNegotiation = body.negotiation || previewMock.negotiation || {}
      var bodySizing = body.sizing || previewMock.sizing || {}
      var bodyFinancial = body.financial || previewMock.financial || {}

      var leadDoc = bodyLead.document || bodyLead.cpf_cnpj || '123.456.789-00'
      var leadPhone = bodyLead.phone || bodyLead.whatsapp || '(11) 98765-4321'
      var leadName = bodyLead.name || 'Cliente Exemplo'
      var leadEmail = bodyLead.email || 'cliente@exemplo.com'
      var leadAddress = bodyLead.address || 'Av. Brasil, 1500 - São Paulo/SP'

      var kitPower = Number(
        bodySizing.kit_power_kwp || bodySizing.power_kwp || bodySizing.kwp || 6.5,
      )
      var avgCons = Number(bodySizing.avg_consumption || bodySizing.monthly_consumption || 600)
      var estGen = Number(
        bodySizing.estimated_monthly_generation || bodySizing.monthly_generation || 750,
      )
      var modQty = Number(bodySizing.module_qty || bodySizing.module_quantity || 12)

      var totInv = Number(
        bodyFinancial.total_investment || bodyFinancial.investment || bodyFinancial.price || 24900,
      )
      var monSav = Number(bodyFinancial.monthly_savings || bodyFinancial.economy_monthly || 550)
      var pbYears = Number(
        bodyFinancial.payback_years !== undefined
          ? bodyFinancial.payback_years
          : bodyFinancial.payback || 3.8,
      )
      var pbMonths = Number(
        bodyFinancial.payback_months !== undefined
          ? bodyFinancial.payback_months
          : Math.round(pbYears * 12),
      )
      var annSav = Number(
        bodyFinancial.annual_savings || bodyFinancial.yearly_savings || monSav * 12,
      )
      var sav25y = Number(
        bodyFinancial.savings_25_years || bodyFinancial.total_savings_25y || annSav * 25,
      )

      var previewSemanticContext = {
        lead: {
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          whatsapp: leadPhone,
          document: leadDoc,
          cpf_cnpj: leadDoc,
          address: leadAddress,
          city: bodyLead.city || 'São Paulo',
          state: bodyLead.state || 'SP',
        },
        negotiation: {
          id: bodyNegotiation.id || 'preview_neg_01',
          title: bodyNegotiation.title || 'Proposta Solar Residencial',
          validity: bodyNegotiation.validity || '10 dias',
          validity_date: bodyNegotiation.validity_date || '',
          payment_terms: bodyNegotiation.payment_terms || 'Entrada + 12x no cartão',
          defined_payment_method: bodyNegotiation.defined_payment_method || 'Cartão de Crédito',
          accepted_payment_methods:
            bodyNegotiation.accepted_payment_methods || 'PIX, Cartão, Financiamento',
          installation_lead_time: bodyNegotiation.installation_lead_time || '30 dias',
          notes: bodyNegotiation.notes || '',
          description: bodyNegotiation.description || 'Sistema Fotovoltaico 6.5 kWp',
        },
        sizing: {
          kit_power_kwp: kitPower,
          power_kwp: kitPower,
          kwp: kitPower,
          avg_consumption: avgCons,
          average_consumption: avgCons,
          monthly_consumption: avgCons,
          consumption_kwh: avgCons,
          estimated_monthly_generation: estGen,
          monthly_generation: estGen,
          generation_kwh: estGen,
          module_qty: modQty,
          module_quantity: modQty,
          modules_count: modQty,
          inverters: bodySizing.inverters || [{ brand: 'Deye', model: 'SUN-5K', power: 5, qty: 1 }],
          consumer_category: bodySizing.consumer_category || 'Residencial',
          simultaneity_factor: bodySizing.simultaneity_factor || 30,
          network_type: bodySizing.network_type || 'Bifásico',
          roof_type: bodySizing.roof_type || 'Cerâmico',
          concessionaire: bodySizing.concessionaire || 'Copel',
        },
        financial: {
          total_investment: totInv,
          investment: totInv,
          price: totInv,
          total_value: totInv,
          sale_price: totInv,
          subtotal: totInv,
          discount_amount: 0,
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
          tariff_details: { te: 0.45, tusd: 0.65, total: 1.1 },
          tariff_rate: 1.1,
          tariff_te: 0.45,
          tariff_tusd: 0.65,
        },
      }

      var SEMANTIC_CONCEPTS = [
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
            'geracao estimada',
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
          ],
          keywords: ['geracao', 'generation', 'producao', 'production'],
          negativeKeywords: ['consumo', 'consumption', 'potencia', 'kwp'],
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

      function resolvePreviewSemanticValue(rawKey) {
        if (!rawKey || typeof rawKey !== 'string') return { resolved: false }
        var normKey = normalizeSemanticStr(rawKey)
        var keyTokens = getSemanticTokenList(rawKey)

        var cats = ['lead', 'sizing', 'financial', 'negotiation']
        for (var ci = 0; ci < cats.length; ci++) {
          var cName = cats[ci]
          var cObj = previewSemanticContext[cName]
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

        for (var si = 0; si < SEMANTIC_CONCEPTS.length; si++) {
          var sc = SEMANTIC_CONCEPTS[si]
          for (var yi = 0; yi < sc.synonyms.length; yi++) {
            if (normKey === normalizeSemanticStr(sc.synonyms[yi])) {
              var val = previewSemanticContext[sc.targetCategory]
                ? previewSemanticContext[sc.targetCategory][sc.targetField]
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

        var sortedKey = keyTokens.slice().sort().join(' ')
        for (var ti = 0; ti < SEMANTIC_CONCEPTS.length; ti++) {
          var tc = SEMANTIC_CONCEPTS[ti]
          for (var ty = 0; ty < tc.synonyms.length; ty++) {
            var synTokens = getSemanticTokenList(tc.synonyms[ty])
            if (sortedKey === synTokens.slice().sort().join(' ') && sortedKey.length > 0) {
              var valT = previewSemanticContext[tc.targetCategory]
                ? previewSemanticContext[tc.targetCategory][tc.targetField]
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
            var valK = previewSemanticContext[kc.targetCategory]
              ? previewSemanticContext[kc.targetCategory][kc.targetField]
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

      var enrichedPreviewLead = Object.assign({}, previewSemanticContext.lead, bodyLead)
      var enrichedPreviewSizing = Object.assign({}, previewSemanticContext.sizing, bodySizing)
      var enrichedPreviewFinancial = Object.assign(
        {},
        previewSemanticContext.financial,
        bodyFinancial,
      )
      var enrichedPreviewNegotiation = Object.assign(
        {},
        previewSemanticContext.negotiation,
        bodyNegotiation,
      )

      var previewDynamicKeys = []
      if (
        matchingTplPreview &&
        matchingTplPreview.variable_schema &&
        matchingTplPreview.variable_schema.dynamic
      ) {
        var dynSchema = matchingTplPreview.variable_schema.dynamic
        if (Array.isArray(dynSchema)) {
          for (var pdi = 0; pdi < dynSchema.length; pdi++) {
            var pdItem = dynSchema[pdi]
            var pdKey = typeof pdItem === 'string' ? pdItem : pdItem.key || pdItem.name || ''
            if (pdKey) previewDynamicKeys.push(pdKey)
          }
        } else if (dynSchema && typeof dynSchema === 'object') {
          previewDynamicKeys = Object.keys(dynSchema)
        }
      }

      var previewResolvedReport = {}
      var previewUnresolvedReport = []

      for (var pri = 0; pri < previewDynamicKeys.length; pri++) {
        var pKey = previewDynamicKeys[pri]
        var pRes = resolvePreviewSemanticValue(pKey)
        if (pRes.resolved) {
          previewResolvedReport[pKey] = {
            category: pRes.category,
            field: pRes.field,
            matchType: pRes.matchType,
            value: pRes.value,
          }
          if (pRes.category === 'lead') enrichedPreviewLead[pKey] = pRes.value
          else if (pRes.category === 'sizing') enrichedPreviewSizing[pKey] = pRes.value
          else if (pRes.category === 'financial') enrichedPreviewFinancial[pKey] = pRes.value
          else if (pRes.category === 'negotiation') enrichedPreviewNegotiation[pKey] = pRes.value
        } else {
          previewUnresolvedReport.push(pKey)
        }
      }

      if (previewDynamicKeys.length > 0) {
        safeLogInfo('Relatório de Mapeamento Semântico no Preview', {
          template_id: templateId,
          total_dynamic: previewDynamicKeys.length,
          resolved_count: Object.keys(previewResolvedReport).length,
          unresolved_count: previewUnresolvedReport.length,
          resolved: previewResolvedReport,
          unresolved: previewUnresolvedReport,
        })
      }

      const payload = {
        template_id: templateId,
        fixed_data: rawFixedData,
        lead: enrichedPreviewLead,
        sizing: enrichedPreviewSizing,
        financial: enrichedPreviewFinancial,
        negotiation: enrichedPreviewNegotiation,
      }
      let bodyStr = '{}'
      try {
        bodyStr = JSON.stringify(payload)
      } catch (_) {}

      const authHeaders = resolveAuthHeaders(previewAuthConfig, apiSecret)
      const requestHeaders = Object.assign({}, authHeaders, {
        'Content-Type': 'application/json; charset=utf-8',
      })

      const sanitizedHeaders = {}
      for (const h of Object.keys(requestHeaders)) {
        const hLower = h.toLowerCase()
        if (
          hLower.indexOf('secret') !== -1 ||
          hLower.indexOf('auth') !== -1 ||
          hLower.indexOf('token') !== -1 ||
          hLower.indexOf('key') !== -1
        ) {
          sanitizedHeaders[h] = '[REDACTED]'
        } else {
          sanitizedHeaders[h] = requestHeaders[h]
        }
      }

      safeLogInfo('Disparando chamada de preview para o Gerador (tentativa 1)', {
        url: finalUrl,
        method: targetMethod,
        headers: sanitizedHeaders,
      })

      let res
      try {
        res = $http.send({
          url: finalUrl,
          method: targetMethod,
          headers: requestHeaders,
          body: bodyStr,
          timeout: 30,
        })
      } catch (err) {
        safeLogWarn(
          'Falha na chamada de preview via URL derivada do contract, tentando fallback com URL fixa',
          {
            error: String(err),
            url: finalUrl,
          },
        )

        // Retry com fallback: rota direta e sabidamente acessível generatorUrl + caminho padrão
        const fallbackUrl = generatorUrl + '/backend/v1/templates/' + templateId + '/preview'
        const fallbackHeaders = {
          'Content-Type': 'application/json; charset=utf-8',
        }
        if (apiSecret) {
          fallbackHeaders['x-api-secret'] = apiSecret
        }

        const sanitizedFallbackHeaders = {}
        for (const h of Object.keys(fallbackHeaders)) {
          const hLower = h.toLowerCase()
          if (
            hLower.indexOf('secret') !== -1 ||
            hLower.indexOf('auth') !== -1 ||
            hLower.indexOf('token') !== -1 ||
            hLower.indexOf('key') !== -1
          ) {
            sanitizedFallbackHeaders[h] = '[REDACTED]'
          } else {
            sanitizedFallbackHeaders[h] = fallbackHeaders[h]
          }
        }

        safeLogInfo('Disparando chamada de preview para o Gerador (tentativa 2 - fallback)', {
          url: fallbackUrl,
          method: 'POST',
          headers: sanitizedFallbackHeaders,
        })

        try {
          res = $http.send({
            url: fallbackUrl,
            method: 'POST',
            headers: fallbackHeaders,
            body: bodyStr,
            timeout: 30,
          })
        } catch (fallbackErr) {
          safeLogError('Falha ao conectar com o Gerador de Propostas (preview) após fallback', {
            error_tentativa_1: String(err),
            url_tentativa_1: finalUrl,
            error_tentativa_2: String(fallbackErr),
            url_tentativa_2: fallbackUrl,
          })
          return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
        }
      }

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

        safeLogError('Gerador retornou erro no preview', {
          status: res.statusCode,
          raw_body: rawBody,
          templateId: templateId,
        })

        if (res.json && typeof res.json === 'object' && Object.keys(res.json).length > 0) {
          return e.json(res.statusCode, res.json)
        }

        return e.json(res.statusCode, {
          message: 'Erro do Gerador (status ' + res.statusCode + ')',
          detail: rawBody || 'Nenhum detalhe retornado pelo gerador.',
        })
      }

      const result = res.json || {}
      if (result && result.view_url) {
        let viewUrl = String(result.view_url)
        // Se já for URL absoluta (http:// ou https://), substitui o origin/domínio pelo generatorPublicUrl
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
        $app.logger().error('Exceção não capturada no handler preview', 'error', String(globalErr))
      } catch (_) {}
      return e.json(500, {
        message: 'Erro interno ao gerar preview do template.',
        detail: String(globalErr),
      })
    }
  },
  $apis.requireAuth(),
)
