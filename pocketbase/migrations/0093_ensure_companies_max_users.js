migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('max_users')) {
      col.fields.add(new NumberField({ name: 'max_users' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (col.fields.getByName('max_users')) {
      col.fields.removeByName('max_users')
      app.save(col)
    }
  },
)
