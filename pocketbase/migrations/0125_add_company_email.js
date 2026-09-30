migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('email')) {
      col.fields.add(new TextField({ name: 'email' }))
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('companies')
      if (col.fields.getByName('email')) {
        col.fields.removeByName('email')
        app.save(col)
      }
    } catch (_) {}
  },
)
