migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.add(
      new FileField({
        name: 'logo',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('logo')
    app.save(col)
  },
)
