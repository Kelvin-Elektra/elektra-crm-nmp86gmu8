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

      const payload = {
        fixed_data: rawFixedData,
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
