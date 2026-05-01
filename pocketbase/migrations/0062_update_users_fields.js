migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.add(new NumberField({ name: 'max_discount', min: 0, max: 100 }))
    col.fields.add(new NumberField({ name: 'commission_rate', min: 0, max: 100 }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('max_discount')
    col.fields.removeByName('commission_rate')
    app.save(col)
  },
)
