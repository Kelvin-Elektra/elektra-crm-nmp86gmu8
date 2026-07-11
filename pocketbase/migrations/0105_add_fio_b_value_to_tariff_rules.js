migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_tariff_rules')
    if (!col.fields.getByName('fio_b_value')) {
      col.fields.add(new NumberField({ name: 'fio_b_value' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_tariff_rules')
    col.fields.removeByName('fio_b_value')
    app.save(col)
  },
)
