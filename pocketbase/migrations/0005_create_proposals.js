migrate(
  (app) => {
    const collection = new Collection({
      name: 'proposals',
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
          name: 'negotiation_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('negotiations').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        { name: 'kit_details', type: 'text' },
        { name: 'price', type: 'number' },
        { name: 'payment_terms', type: 'text' },
        { name: 'status', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('proposals')
    app.delete(collection)
  },
)
