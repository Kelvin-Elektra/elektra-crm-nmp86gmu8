migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    if (!col.fields.getByName('login_background')) {
      col.fields.add(
        new FileField({
          name: 'login_background',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    if (col.fields.getByName('login_background')) {
      col.fields.removeByName('login_background')
      app.save(col)
    }
  },
)
