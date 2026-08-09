routerAdd(
  'POST',
  '/backend/v1/templates/preview',
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

    const body = e.requestInfo().body || {}

    let res
    try {
      res = $http.send({
        url: generatorUrl + '/api/proposals/preview',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Secret': apiSecret,
        },
        body: JSON.stringify({
          template_id: body.template_id || '',
          fixed_data: body.fixed_data || {},
          branding: body.branding || {},
        }),
        timeout: 30,
      })
    } catch (err) {
      $app.logger().error('Generator preview failed', 'error', err.message)
      return e.json(502, { error: 'Falha ao conectar ao Gerador.' })
    }

    if (res.statusCode !== 200) {
      return e.json(res.statusCode, { error: 'Erro ao gerar preview no Gerador.' })
    }

    const contentType = res.headers['Content-Type'] || res.headers['content-type'] || ''
    if (contentType.indexOf('text/html') !== -1) {
      return e.html(200, res.body + '')
    }

    return e.json(200, res.json)
  },
  $apis.requireAuth(),
)
