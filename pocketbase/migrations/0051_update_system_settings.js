migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    if (!col.fields.getByName('logo')) {
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {},
)
