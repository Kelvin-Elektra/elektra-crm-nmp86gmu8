migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')

    if (!col.fields.getByName('generator_url')) {
      col.fields.add(new TextField({ name: 'generator_url' }))
    }

    app.save(col)

    try {
      const record = app.findFirstRecordByFilter('system_settings', '1=1')
      if (!record.getString('generator_url')) {
        record.set('generator_url', 'https://gerador.elektrasolucoes.tech')
        app.save(record)
      }
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.fields.removeByName('generator_url')
    app.save(col)
  },
)
