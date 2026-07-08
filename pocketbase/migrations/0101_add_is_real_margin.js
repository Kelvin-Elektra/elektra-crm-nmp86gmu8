migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (!col.fields.getByName('is_real_margin')) {
      col.fields.add(new BoolField({ name: 'is_real_margin' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    col.fields.removeByName('is_real_margin')
    app.save(col)
  },
)
