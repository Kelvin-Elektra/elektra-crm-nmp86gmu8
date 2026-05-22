migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('system_settings')

    try {
      app.findFirstRecordByData('system_settings', 'system_name', 'Elektra CRM')
    } catch (_) {
      const record = new Record(collection)
      record.set('system_name', 'Elektra CRM')
      app.save(record)
    }
  },
  (app) => {
    // Revert is empty for conditional seed
  },
)
