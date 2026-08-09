routerAdd(
  'GET',
  '/backend/v1/templates',
  (e) => {
    const apiSecret = $secrets.get('GENERATOR_API_SECRET')
    if (!apiSecret) {
      return e.json(503, { error: 'Secret do Gerador não configurado.' })
    }

    let generatorUrl = ''
    try {
      const settings = $app.findFirstRecordByFilter('system_settings', '1=1')
      generatorUrl = settings.getString('generator_url')
    } catch (_) {}

    if (!generatorUrl) {
      return e.json(503, { error: 'URL do Gerador não configurada.' })
    }

    if (generatorUrl.endsWith('/')) {
      generatorUrl = generatorUrl.slice(0, -1)
    }

    let res
    try {
      res = $http.send({
        url: generatorUrl + '/api/templates',
        method: 'GET',
        headers: { 'X-Api-Secret': apiSecret },
        timeout: 15,
      })
    } catch (err) {
      $app.logger().error('Generator templates fetch failed', 'error', err.message)
      return e.json(502, { error: 'Falha ao conectar ao Gerador.' })
    }

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, { error: 'Erro ao buscar templates do Gerador.' })
    }

    return e.json(200, res.json)
  },
  $apis.requireAuth(),
)
