migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (!col.fields.getByName('installation_id')) {
      col.fields.add(
        new RelationField({
          name: 'installation_id',
          collectionId: app.findCollectionByNameOrId('pv_installations').id,
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('calc_base')) {
      col.fields.add(
        new SelectField({
          name: 'calc_base',
          values: ['modules', 'kwp', 'kw', 'fixed'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('multiplier')) {
      col.fields.add(new NumberField({ name: 'multiplier' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    col.fields.removeByName('installation_id')
    col.fields.removeByName('calc_base')
    col.fields.removeByName('multiplier')
    app.save(col)
  },
)
