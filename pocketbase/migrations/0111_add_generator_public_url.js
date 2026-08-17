migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')

    if (!col.fields.getByName('generator_public_url')) {
      col.fields.add(new TextField({ name: 'generator_public_url' }))
    }

    app.save(col)

    try {
      const records = app.findRecordsByFilter('system_settings', 'id != ""', '', 1, 0)
      if (records.length > 0) {
        records[0].set('generator_public_url', 'https://gerador.elektrasolucoes.tech')
        app.save(records[0])
      }
    } catch (_) {}
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.fields.removeByName('generator_public_url')
    app.save(col)
  },
)
