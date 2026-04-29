migrate(
  (app) => {
    const collection = new Collection({
      name: 'pv_efficiency_rules',
      type: 'base',
      listRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
      viewRule: "@request.auth.id != '' && company_id = @request.auth.company_id",
      createRule:
        "@request.auth.id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'admin_elektra' || @request.auth.role = 'admin_company')",
      updateRule:
        "@request.auth.id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'admin_elektra' || @request.auth.role = 'admin_company')",
      deleteRule:
        "@request.auth.id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'admin_elektra' || @request.auth.role = 'admin_company')",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('companies').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nominal_loss', type: 'number', required: false },
        { name: 'orientation_losses', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pv_efficiency_rules_company ON pv_efficiency_rules (company_id)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pv_efficiency_rules')
    app.delete(collection)
  },
)
