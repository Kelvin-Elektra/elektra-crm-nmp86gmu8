routerAdd(
  'POST',
  '/backend/v1/templates/{templateId}/preview',
  (e) => {
    const templateId = e.request.pathValue('templateId')
    if (!templateId) {
      return e.badRequestError('templateId é obrigatório.')
    }

    let generatorUrl = ''
    try {
      const record = $app.findFirstRecordByFilter('system_settings', 'id != ""')
      generatorUrl = record.getString('generator_url')
    } catch (_) {}

    if (!generatorUrl) {
      return e.json(500, { message: 'Generator URL não configurada nas configurações do sistema.' })
    }

    if (generatorUrl.endsWith('/')) {
      generatorUrl = generatorUrl.slice(0, -1)
    }

    const apiSecret = $secrets.get('API_CRM_GERADOR')

    const body = e.requestInfo().body || {}
    var bodyStr
    try {
      bodyStr = JSON.stringify(body)
    } catch (_) {
      bodyStr = '{}'
    }

    let res
    try {
      res = $http.send({
        url: generatorUrl + '/backend/v1/templates/' + templateId + '/preview',
        method: 'POST',
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
        .error('Falha ao conectar com o Gerador de Propostas (preview)', 'error', String(err))
      return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
    }

    if (res.statusCode >= 400) {
      var errMsg = 'Erro ao gerar preview no gerador.'
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
          'Gerador retornou erro no preview',
          'status',
          res.statusCode,
          'templateId',
          templateId,
        )
      return e.json(res.statusCode, { message: errMsg })
    }

    return e.json(200, res.json)
  },
  $apis.requireAuth(),
)
