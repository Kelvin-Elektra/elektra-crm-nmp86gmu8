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
      return e.json(500, {
        message: 'URL do Gerador não configurada nas configurações do sistema.',
      })
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

    function fixMojibakeDeep(obj) {
      if (obj === null || obj === undefined) return obj
      if (typeof obj === 'string') {
        try {
          // Se contiver sequências típicas de mojibake UTF-8 decodificado como latin1 (ex: Ã, Â, etc.)
          if (/[\u00C2-\u00C3]/.test(obj)) {
            return decodeURIComponent(escape(obj))
          }
        } catch (_) {}
        return obj
      }
      if (Array.isArray(obj)) {
        return obj.map(fixMojibakeDeep)
      }
      if (typeof obj === 'object') {
        var copy = {}
        var keys = Object.keys(obj)
        for (var i = 0; i < keys.length; i++) {
          copy[keys[i]] = fixMojibakeDeep(obj[keys[i]])
        }
        return copy
      }
      return obj
    }

    var rawResult = res.json || {}
    var result = fixMojibakeDeep(rawResult)

    // Garantir formato uniforme { contract, templates }
    if (Array.isArray(result)) {
      result = {
        contract: null,
        templates: result,
      }
    } else if (!result.templates && Array.isArray(result.data)) {
      result = {
        contract: result.contract || null,
        templates: result.data,
      }
    } else if (!result.templates) {
      result = {
        contract: result.contract || null,
        templates: [],
      }
    }

    if (e.response && e.response.header) {
      try {
        e.response.header().set('Content-Type', 'application/json; charset=utf-8')
      } catch (_) {}
    }

    return e.json(200, result)
  },
  $apis.requireAuth(),
)
