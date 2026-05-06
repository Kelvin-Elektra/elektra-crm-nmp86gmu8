migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pipeline_stages')
    col.fields.add(new BoolField({ name: 'is_sale_stage' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pipeline_stages')
    col.fields.removeByName('is_sale_stage')
    app.save(col)
  },
)
