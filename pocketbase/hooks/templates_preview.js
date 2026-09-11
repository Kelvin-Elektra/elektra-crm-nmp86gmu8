routerAdd(
  'POST',
  '/backend/v1/templates/{templateId}/preview',
  (e) => {
    const templateId = e.request.pathValue('templateId')
    if (!templateId) {
      return e.badRequestError('templateId é obrigatório.')
    }

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

        try {
          $app
            .logger()
            .info('Contrato recebido do Gerador (preview)', 'contract', JSON.stringify(contract))
        } catch (_) {}

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
      $app
        .logger()
        .warn(
          'Aviso: Não foi possível obter contract atualizado antes do preview, usando fallback padrão',
          'error',
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

    const body = e.requestInfo().body || {}
    const payload = {
      fixed_data: body.fixed_data || body.branding || body,
    }
    let bodyStr = '{}'
    try {
      bodyStr = JSON.stringify(payload)
    } catch (_) {}

    const authHeaders = resolveAuthHeaders(previewAuthConfig, apiSecret)
    const requestHeaders = Object.assign({}, authHeaders, {
      'Content-Type': 'application/json',
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

    $app
      .logger()
      .info(
        'Disparando chamada de preview para o Gerador',
        'url',
        finalUrl,
        'method',
        targetMethod,
        'headers',
        JSON.stringify(sanitizedHeaders),
      )

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
      $app
        .logger()
        .error(
          'Falha ao conectar com o Gerador de Propostas (preview)',
          'error',
          String(err),
          'url',
          finalUrl,
        )
      return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
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

      $app
        .logger()
        .error(
          'Gerador retornou erro no preview',
          'status',
          res.statusCode,
          'raw_body',
          rawBody,
          'templateId',
          templateId,
        )

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

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
