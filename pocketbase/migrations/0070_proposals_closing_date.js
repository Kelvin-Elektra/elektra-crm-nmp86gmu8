migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.add(new DateField({ name: 'closing_date' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.removeByName('closing_date')
    app.save(col)
  },
)
