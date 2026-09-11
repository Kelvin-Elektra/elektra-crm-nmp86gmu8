migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')

    if (!col.fields.getByName('templates_config')) {
      col.fields.add(new JSONField({ name: 'templates_config' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.removeByName('templates_config')
    app.save(col)
  },
)
