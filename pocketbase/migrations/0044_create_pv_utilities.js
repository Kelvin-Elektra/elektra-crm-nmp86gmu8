migrate(
  (app) => {
    const collection = new Collection({
      name: 'pv_utilities',
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
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'connections', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pv_utilities_company ON pv_utilities (company_id)',
        'CREATE UNIQUE INDEX idx_pv_utilities_unique_name ON pv_utilities (company_id, name)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('pv_utilities')
    app.delete(collection)
  },
)
