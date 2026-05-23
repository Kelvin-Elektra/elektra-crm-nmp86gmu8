migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('max_users')) {
      col.fields.add(new NumberField({ name: 'max_users' }))
    }
    app.save(col)

    // Set default max_users for existing companies
    const companies = app.findRecordsByFilter('companies', '1=1', '', 1000, 0)
    for (const c of companies) {
      if (!c.getInt('max_users')) {
        c.set('max_users', 5)
        app.saveNoValidate(c)
      }
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
