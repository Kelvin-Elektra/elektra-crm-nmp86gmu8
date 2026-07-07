migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('value')
    if (field) {
      field.required = false
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('value')
    if (field) {
      field.required = true
    }
    app.save(col)
  },
)
