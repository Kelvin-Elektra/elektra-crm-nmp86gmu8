migrate(
  (app) => {
    const collection = new Collection({
      name: 'negotiations',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      createRule: "@request.auth.id != ''",
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
        {
          name: 'lead_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('leads').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'stage', type: 'text', required: true },
        { name: 'concessionaire', type: 'text' },
        { name: 'uc', type: 'text' },
        { name: 'address', type: 'text' },
        { name: 'avg_consumption', type: 'number' },
        { name: 'tags', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('negotiations')
    app.delete(collection)
  },
)
