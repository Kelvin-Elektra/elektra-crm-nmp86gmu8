migrate(
  (app) => {
    const PUBLIC_URL = 'https://geradorproposta.elektrasolucoes.tech'

    try {
      const record = app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      record.set('generator_public_url', PUBLIC_URL)
      app.save(record)
    } catch (_) {
      try {
        const records = app.findRecordsByFilter('system_settings', 'id != ""', '', 1, 0)
        if (records.length > 0) {
          records[0].set('generator_public_url', PUBLIC_URL)
          app.save(records[0])
        }
      } catch (_) {}
    }
  },
  (app) => {
    const PREVIOUS_URL = 'https://gerador.elektrasolucoes.tech'

    try {
      const record = app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      record.set('generator_public_url', PREVIOUS_URL)
      app.save(record)
    } catch (_) {
      try {
        const records = app.findRecordsByFilter('system_settings', 'id != ""', '', 1, 0)
        if (records.length > 0) {
          records[0].set('generator_public_url', PREVIOUS_URL)
          app.save(records[0])
        }
      } catch (_) {}
    }
  },
)
