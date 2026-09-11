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

    const apiSecret = $secrets.get('API_CRM_GERADOR')

    const body = e.requestInfo().body || {}
    const templateId = body.template_id
    const externalId = body.external_id

    if (!templateId) {
      return e.badRequestError('template_id é obrigatório.')
    }
    if (!externalId) {
      return e.badRequestError('external_id é obrigatório.')
    }

    // 1. Ler o contract dinamicamente do endpoint GET /backend/v1/templates/list
    let createEndpoint = '/backend/v1/proposals'
    let createMethod = 'POST'

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
        if (contract.create_proposal && contract.create_proposal.endpoint) {
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
    } catch (listErr) {
      $app
        .logger()
        .warn(
          'Aviso: Não foi possível obter contract atualizado antes da criação de proposta, usando fallback padrão',
          'error',
          String(listErr),
        )
    }

    if (createEndpoint.charAt(0) !== '/') {
      createEndpoint = '/' + createEndpoint
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

    let res
    try {
      res = $http.send({
        url: generatorUrl + createEndpoint,
        method: createMethod,
        headers: {
          'x-api-secret': apiSecret,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
        timeout: 30,
      })
    } catch (err) {
      $app
        .logger()
        .error(
          'Falha ao conectar com o Gerador de Propostas (create_proposal)',
          'error',
          String(err),
        )
      return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
    }

    if (res.statusCode >= 400) {
      let errMsg = 'Erro ao gerar proposta no gerador.'
      try {
        if (res.json && res.json.message) {
          errMsg = res.json.message
        } else if (res.json && res.json.error) {
          errMsg = res.json.error
        }
      } catch (_) {}
      $app
        .logger()
        .error(
          'Gerador retornou erro na criação de proposta',
          'status',
          res.statusCode,
          'template_id',
          templateId,
          'external_id',
          externalId,
        )
      return e.json(res.statusCode, { message: errMsg })
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
