migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('role_company')) {
      col.fields.add(new TextField({ name: 'role_company' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('role_company')) {
      col.fields.removeByName('role_company')
      app.save(col)
    }
  },
)
