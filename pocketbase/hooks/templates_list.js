routerAdd(
  'GET',
  '/backend/v1/templates/list',
  (e) => {
    // Detecção robusta do template 4: NUNCA pelo substring '4' no id (ids são
    // aleatórios — o template 4 ativo 'b04lnty24fpa1oj' não contém '4').
    // Critérios, em ordem: campos de identidade (template_key/number/slug),
    // nome ("Template 4"/"Modelo 4") e chaves exclusivas no schema/mock.
    function looksLikeTemplate4(tpl) {
      if (!tpl || typeof tpl !== 'object') return false
      var identityFields = [
        tpl.template_key,
        tpl.key,
        tpl.slug,
        tpl.number,
        tpl.template_number,
        tpl.code,
      ]
      for (var i4 = 0; i4 < identityFields.length; i4++) {
        var v4 = String(identityFields[i4] == null ? '' : identityFields[i4])
          .toLowerCase()
          .replace(/[\s_-]/g, '')
        if (v4 === '4' || v4 === 'template4' || v4 === 'modelo4') return true
      }
      var n4 = String(tpl.name || '').toLowerCase()
      if (/(^|[^0-9])(template|modelo)\s*4([^0-9]|$)/.test(n4)) return true
      var markerBlob4 = ''
      try {
        markerBlob4 = (
          JSON.stringify(tpl.variable_schema || {}) +
          ' ' +
          JSON.stringify(tpl.mock_data || {})
        ).toLowerCase()
      } catch (_) {}
      if (
        markerBlob4.indexOf('min_bill_after_solar') !== -1 ||
        markerBlob4.indexOf('annual_generation_mwh') !== -1 ||
        markerBlob4.indexOf('savings_projection') !== -1
      ) {
        return true
      }
      return false
    }

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

    // Template 4: garantir campo fixo 'logo' (type image) no variable_schema.
    // O Gerador não declara esse campo no contrato do template 4 — sem ele a
    // logo nunca é enviada no fixed_data e sai como placeholder no HTML final.
    try {
      if (Array.isArray(result.templates)) {
        for (var ti = 0; ti < result.templates.length; ti++) {
          var tpl = result.templates[ti]
          if (!tpl || !looksLikeTemplate4(tpl)) continue
          if (!tpl.variable_schema || typeof tpl.variable_schema !== 'object') {
            tpl.variable_schema = { fixed: [], dynamic: {} }
          }
          if (!Array.isArray(tpl.variable_schema.fixed)) tpl.variable_schema.fixed = []
          var hasLogoField = false
          for (var lfi = 0; lfi < tpl.variable_schema.fixed.length; lfi++) {
            if (tpl.variable_schema.fixed[lfi] && tpl.variable_schema.fixed[lfi].key === 'logo') {
              hasLogoField = true
              break
            }
          }
          if (!hasLogoField) {
            tpl.variable_schema.fixed.push({
              key: 'logo',
              label: 'Logo',
              type: 'image',
            })
          }
        }
      }
    } catch (logoErr) {
      $app.logger().warn('Aviso ao injetar campo logo no schema do template 4', String(logoErr))
    }

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
