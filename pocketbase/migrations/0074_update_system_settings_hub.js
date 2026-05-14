migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.fields.add(
      new FileField({
        name: 'hub_logo',
        maxSelect: 1,
        maxSize: 5242880,
        mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
      }),
    )
    col.fields.add(new TextField({ name: 'hub_url' }))
    col.fields.add(new TextField({ name: 'hub_description' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.fields.removeByName('hub_logo')
    col.fields.removeByName('hub_url')
    col.fields.removeByName('hub_description')
    app.save(col)
  },
)
