routerAdd(
  'POST',
  '/backend/v1/proposals/generate-external',
  (e) => {
    let generatorUrl = ''
    let generatorPublicUrl = ''
    try {
      const record = $app.findFirstRecordByFilter('system_settings', 'id != ""')
      generatorUrl = record.getString('generator_url')
      generatorPublicUrl = record.getString('generator_public_url')
    } catch (_) {}

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

    const apiSecret = $secrets.get('API_CRM_GERADOR') || ''

    const body = e.requestInfo().body || {}
    const templateId = body.template_id
    const externalId = body.external_id

    if (!templateId) {
      return e.badRequestError('template_id é obrigatório.')
    }
    if (!externalId) {
      return e.badRequestError('external_id é obrigatório.')
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
          // Nome de header customizado
          headers[authConfig] = secretValue
        }
        return headers
      }

      if (typeof authConfig === 'object' && authConfig !== null) {
        if (authConfig.headers && typeof authConfig.headers === 'object') {
          for (const k of Object.keys(authConfig.headers)) {
            let v = authConfig.headers[k]
            if (typeof v === 'string' && (v === '{secret}' || v === ':secret' || v === '$secret')) {
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

    // 1. Ler o contract dinamicamente do endpoint GET /backend/v1/templates/list
    let createEndpoint = '/backend/v1/proposals'
    let createMethod = 'POST'
    let activeBaseUrl = generatorUrl
    let proposalAuthConfig = null

    try {
      const listRes = $http.send({
        url: generatorUrl + '/backend/v1/templates/list',
        method: 'GET',
        headers: {
          'x-api-secret': apiSecret,
        },
        timeout: 10,
      })

      if (listRes.statusCode === 200 && listRes.json && listRes.json.contract) {
        const contract = listRes.json.contract

        // 2 (a) Logar o bloco contract recebido (JSON stringificado)
        try {
          $app.logger().info('Contrato recebido do Gerador', 'contract', JSON.stringify(contract))
        } catch (_) {}

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
      $app
        .logger()
        .warn(
          'Aviso: Não foi possível obter contract atualizado antes da criação de proposta, usando fallback padrão',
          'error',
          String(listErr),
        )
    }

    // Função auxiliar para sanitizar headers para log
    function sanitizeHeadersForLog(headers) {
      const sanitized = {}
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
    const payload = {
      template_id: templateId,
      external_id: externalId,
      fixed_data: body.fixed_data || {},
      lead: body.lead || {},
      negotiation: body.negotiation || {},
      sizing: body.sizing || {},
      financial: body.financial || {},
    }

    let bodyStr = '{}'
    try {
      bodyStr = JSON.stringify(payload)
    } catch (_) {}

    const authHeaders = resolveAuthHeaders(proposalAuthConfig, apiSecret)
    const requestHeaders = Object.assign({}, authHeaders, {
      'Content-Type': 'application/json',
    })

    // 2 (b) Logar URL final, método e headers (sem valor de secrets) da primeira tentativa
    $app
      .logger()
      .info(
        'Disparando chamada de criação de proposta para o Gerador (tentativa 1)',
        'url',
        finalUrl,
        'method',
        createMethod,
        'headers',
        JSON.stringify(sanitizeHeadersForLog(requestHeaders)),
      )

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
      $app
        .logger()
        .warn(
          'Falha na chamada de criação via URL derivada do contract, tentando fallback com URL fixa',
          'error',
          String(err),
          'url',
          finalUrl,
        )

      // 3. Retry com fallback: caminho fixo sabidamente acessível
      const fallbackUrl = generatorUrl + '/backend/v1/proposals'
      const fallbackHeaders = {
        'Content-Type': 'application/json',
      }
      if (apiSecret) {
        fallbackHeaders['x-api-secret'] = apiSecret
      }

      $app
        .logger()
        .info(
          'Disparando chamada de criação de proposta para o Gerador (tentativa 2 - fallback)',
          'url',
          fallbackUrl,
          'method',
          'POST',
          'headers',
          JSON.stringify(sanitizeHeadersForLog(fallbackHeaders)),
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
        $app
          .logger()
          .error(
            'Falha ao conectar com o Gerador de Propostas (create_proposal) após fallback',
            'error_tentativa_1',
            String(err),
            'url_tentativa_1',
            finalUrl,
            'error_tentativa_2',
            String(fallbackErr),
            'url_tentativa_2',
            fallbackUrl,
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

      $app
        .logger()
        .error(
          'Gerador retornou erro na criação de proposta',
          'status',
          res.statusCode,
          'raw_body',
          rawBody,
          'template_id',
          templateId,
          'external_id',
          externalId,
        )

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

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
