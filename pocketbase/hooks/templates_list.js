routerAdd(
  'GET',
  '/backend/v1/templates/list',
  (e) => {
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

    let res
    try {
      res = $http.send({
        url: generatorUrl + '/backend/v1/templates/list',
        method: 'GET',
        headers: {
          'x-api-secret': apiSecret,
        },
        timeout: 15,
      })
    } catch (err) {
      $app
        .logger()
        .error('Falha ao conectar com o Gerador de Propostas (list)', 'error', String(err))
      return e.json(502, { message: 'Falha ao conectar com o Gerador de Propostas.' })
    }

    if (res.statusCode >= 400) {
      var errMsg = 'Erro ao listar templates do gerador.'
      try {
        if (res.json && res.json.message) {
          errMsg = res.json.message
        } else if (res.json && res.json.error) {
          errMsg = res.json.error
        }
      } catch (_) {}
      $app
        .logger()
        .error('Gerador retornou erro na listagem de templates', 'status', res.statusCode)
      return e.json(res.statusCode, { message: errMsg })
    }

    var result = res.json
    if (!Array.isArray(result)) {
      if (result && Array.isArray(result.templates)) {
        result = result.templates
      } else if (result && Array.isArray(result.data)) {
        result = result.data
      } else if (!result) {
        result = []
      }
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
