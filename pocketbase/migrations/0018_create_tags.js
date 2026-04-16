migrate(
  (app) => {
    const collection = new Collection({
      name: 'tags',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('companies').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'color', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('tags')
    app.delete(collection)
  },
)
