migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('proposal_settings')

    if (!collection.fields.getByName('default_pricing_mode')) {
      collection.fields.add(
        new SelectField({
          name: 'default_pricing_mode',
          values: ['automatic', 'manual'],
          maxSelect: 1,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('proposal_settings')
    collection.fields.removeByName('default_pricing_mode')
    app.save(collection)
  },
)
