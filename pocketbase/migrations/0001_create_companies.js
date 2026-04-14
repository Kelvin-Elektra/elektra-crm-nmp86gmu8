migrate(
  (app) => {
    const collection = new Collection({
      name: 'companies',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin_elektra'",
      updateRule: "@request.auth.role = 'admin_elektra'",
      deleteRule: "@request.auth.role = 'admin_elektra'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('companies')
    app.delete(collection)
  },
)
