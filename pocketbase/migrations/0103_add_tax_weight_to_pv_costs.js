migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (!col.fields.getByName('tax_weight')) {
      col.fields.add(new NumberField({ name: 'tax_weight' }))
    }
    app.save(col)

    const taxCosts = app.findRecordsByFilter('pv_costs', "calc_method = 'tax'", '', 1000, 0)
    taxCosts.forEach((record) => {
      if (!record.get('tax_weight')) {
        record.set('tax_weight', 100)
        app.save(record)
      }
    })
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    col.fields.removeByName('tax_weight')
    app.save(col)
  },
)
