migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_modules')
    if (!col.fields.getByName('warranty')) {
      col.fields.add(new TextField({ name: 'warranty' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_modules')
    if (col.fields.getByName('warranty')) {
      col.fields.removeByName('warranty')
      app.save(col)
    }
  },
)
