migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.add(new NumberField({ name: 'max_users', min: 1 }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('max_users')
    app.save(col)
  },
)
