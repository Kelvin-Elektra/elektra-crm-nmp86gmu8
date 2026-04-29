migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    col.updateRule = "@request.auth.role = 'admin_elektra'"

    const logoField = col.fields.getByName('logo')
    if (logoField && logoField.type !== 'file') {
      col.fields.removeByName('logo')
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        }),
      )
    } else if (!logoField) {
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.listRule = null
    col.viewRule = null
    col.updateRule = null
    app.save(col)
  },
)
