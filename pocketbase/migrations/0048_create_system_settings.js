migrate(
  (app) => {
    const collection = new Collection({
      name: 'system_settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin_elektra'",
      updateRule: "@request.auth.role = 'admin_elektra'",
      deleteRule: "@request.auth.role = 'admin_elektra'",
      fields: [
        { name: 'system_name', type: 'text', required: true },
        {
          name: 'logo',
          type: 'file',
          maxSelect: 1,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('system_settings')
    app.delete(collection)
  },
)
