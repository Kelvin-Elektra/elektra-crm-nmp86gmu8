migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.add(new DateField({ name: 'validity_date' }))
    col.fields.add(new TextField({ name: 'notes' }))
    col.fields.add(new NumberField({ name: 'discount_amount' }))
    col.fields.add(new NumberField({ name: 'total_value' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.removeByName('validity_date')
    col.fields.removeByName('notes')
    col.fields.removeByName('discount_amount')
    col.fields.removeByName('total_value')
    app.save(col)
  },
)
