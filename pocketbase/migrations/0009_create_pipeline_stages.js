migrate(
  (app) => {
    const stages = new Collection({
      name: 'pipeline_stages',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id || @request.auth.role = 'admin_company')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id || @request.auth.role = 'admin_company')",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id || @request.auth.role = 'admin_company')",
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
        { name: 'order', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(stages)
  },
  (app) => {
    const stages = app.findCollectionByNameOrId('pipeline_stages')
    app.delete(stages)
  },
)
