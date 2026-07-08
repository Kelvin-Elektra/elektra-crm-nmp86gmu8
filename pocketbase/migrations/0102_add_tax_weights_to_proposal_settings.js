migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')

    if (!col.fields.getByName('tax1_name')) {
      col.fields.add(new TextField({ name: 'tax1_name' }))
    }
    if (!col.fields.getByName('tax1_weight')) {
      col.fields.add(new NumberField({ name: 'tax1_weight' }))
    }
    if (!col.fields.getByName('tax2_name')) {
      col.fields.add(new TextField({ name: 'tax2_name' }))
    }
    if (!col.fields.getByName('tax2_weight')) {
      col.fields.add(new NumberField({ name: 'tax2_weight' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.removeByName('tax1_name')
    col.fields.removeByName('tax1_weight')
    col.fields.removeByName('tax2_name')
    col.fields.removeByName('tax2_weight')
    app.save(col)
  },
)
