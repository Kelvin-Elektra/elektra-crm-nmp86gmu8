migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('value')
    if (field) {
      field.required = false
      col.fields.add(field)
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('value')
    if (field) {
      field.required = true
      col.fields.add(field)
      app.save(col)
    }
  },
)
