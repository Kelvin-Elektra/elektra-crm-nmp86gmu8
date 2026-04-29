migrate(
  (app) => {
    try {
      app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      return
    } catch (_) {
      const col = app.findCollectionByNameOrId('system_settings')
      const record = new Record(col)
      record.set('system_name', 'Elektra CRM')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
      app.delete(record)
    } catch (_) {}
  },
)
