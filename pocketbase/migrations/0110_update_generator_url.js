migrate(
  (app) => {
    const GENERATOR_URL = 'https://gerador-de-propostas-solares-17366.shrd00.internal.goskip.dev'

    try {
      const record = app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      record.set('generator_url', GENERATOR_URL)
      app.save(record)
    } catch (_) {
      try {
        const records = app.findRecordsByFilter('system_settings', 'id != ""', '', 1, 0)
        if (records.length > 0) {
          records[0].set('generator_url', GENERATOR_URL)
          app.save(records[0])
        }
      } catch (_) {}
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      record.set('generator_url', '')
      app.save(record)
    } catch (_) {}
  },
)
