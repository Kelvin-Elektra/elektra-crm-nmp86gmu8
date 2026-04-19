migrate((app) => {
  const col = app.findCollectionByNameOrId('pv_inverters')
  if (!col.fields.getByName('price')) {
    col.fields.add(new NumberField({ name: 'price' }))
  }
  if (!col.fields.getByName('mppt')) {
    col.fields.add(new NumberField({ name: 'mppt' }))
  }
  app.save(col)
})
