migrate((app) => {
  const col = app.findCollectionByNameOrId('pv_modules')
  if (!col.fields.getByName('price')) {
    col.fields.add(new NumberField({ name: 'price' }))
  }
  app.save(col)
})
