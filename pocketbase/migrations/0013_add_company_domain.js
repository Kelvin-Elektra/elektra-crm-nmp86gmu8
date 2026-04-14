migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('domain')) {
      col.fields.add(new TextField({ name: 'domain' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (col.fields.getByName('domain')) {
      col.fields.removeByName('domain')
    }
    app.save(col)
  },
)
