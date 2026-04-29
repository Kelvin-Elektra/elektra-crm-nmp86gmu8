migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('system_settings')

    if (!collection.fields.getByName('system_name')) {
      collection.fields.add(new TextField({ name: 'system_name', required: true }))
    }

    if (!collection.fields.getByName('logo')) {
      collection.fields.add(new FileField({ name: 'logo', maxSelect: 1 }))
    }

    app.save(collection)
  },
  (app) => {},
)
