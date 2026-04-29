migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.add(
      new RelationField({
        name: 'utility_id',
        collectionId: app.findCollectionByNameOrId('pv_utilities').id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    col.fields.add(new TextField({ name: 'city' }))
    col.fields.add(new TextField({ name: 'state' }))
    col.fields.add(new TextField({ name: 'cep' }))
    col.fields.add(new TextField({ name: 'neighborhood' }))
    col.fields.add(new TextField({ name: 'number' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.removeByName('utility_id')
    col.fields.removeByName('city')
    col.fields.removeByName('state')
    col.fields.removeByName('cep')
    col.fields.removeByName('neighborhood')
    col.fields.removeByName('number')
    app.save(col)
  },
)
