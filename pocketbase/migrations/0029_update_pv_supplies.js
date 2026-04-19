migrate((app) => {
  const col = app.findCollectionByNameOrId('pv_supplies')
  if (!col.fields.getByName('distributor_id')) {
    col.fields.add(
      new RelationField({
        name: 'distributor_id',
        collectionId: app.findCollectionByNameOrId('pv_distributors').id,
        maxSelect: 1,
      }),
    )
  }
  const calcBase = col.fields.getByName('calc_base')
  if (calcBase) {
    calcBase.values = ['modules', 'kwp', 'mppt', 'fixed']
  }
  app.save(col)
})
