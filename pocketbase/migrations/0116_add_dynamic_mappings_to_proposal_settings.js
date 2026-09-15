migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')

    if (!col.fields.getByName('dynamic_mappings')) {
      col.fields.add(new JSONField({ name: 'dynamic_mappings' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    if (col.fields.getByName('dynamic_mappings')) {
      col.fields.removeByName('dynamic_mappings')
    }
    app.save(col)
  },
)
