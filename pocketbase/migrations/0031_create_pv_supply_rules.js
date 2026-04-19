migrate((app) => {
  const col = new Collection({
    name: 'pv_supply_rules',
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
      {
        name: 'supply_id',
        type: 'relation',
        required: true,
        collectionId: app.findCollectionByNameOrId('pv_supplies').id,
        maxSelect: 1,
        cascadeDelete: true,
      },
      {
        name: 'installation_id',
        type: 'relation',
        required: false,
        collectionId: app.findCollectionByNameOrId('pv_installations').id,
        maxSelect: 1,
      },
      {
        name: 'calc_base',
        type: 'select',
        required: true,
        values: ['modules', 'kwp', 'mppt', 'fixed'],
      },
      { name: 'multiplier', type: 'number', required: true },
      { name: 'range_type', type: 'select', required: true, values: ['modules', 'kwp', 'none'] },
      { name: 'min_val', type: 'number', required: false },
      { name: 'max_val', type: 'number', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: ['CREATE INDEX idx_pv_supply_rules_company ON pv_supply_rules (company_id)'],
  })
  app.save(col)
})
