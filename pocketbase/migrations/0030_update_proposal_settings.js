migrate((app) => {
  const col = app.findCollectionByNameOrId('proposal_settings')
  const bm = col.fields.getByName('billing_model')
  if (bm) {
    bm.values = ['direct', 'intermediated']
  } else {
    col.fields.add(new SelectField({ name: 'billing_model', values: ['direct', 'intermediated'] }))
  }
  app.save(col)
})
