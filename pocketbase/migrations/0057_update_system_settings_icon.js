migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('system_settings')
    collection.fields.add(
      new FileField({
        name: 'sidebar_icon',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
      }),
    )
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('system_settings')
    collection.fields.removeByName('sidebar_icon')
    app.save(collection)
  },
)
