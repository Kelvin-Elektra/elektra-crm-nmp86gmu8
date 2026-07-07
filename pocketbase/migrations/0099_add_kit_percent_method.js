migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('calc_method')
    if (field) {
      field.values = ['fixed', 'variable', 'rate', 'tax', 'margin', 'kit_percent']
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    const field = col.fields.getByName('calc_method')
    if (field) {
      field.values = ['fixed', 'variable', 'rate', 'tax', 'margin']
    }
    app.save(col)
  },
)
