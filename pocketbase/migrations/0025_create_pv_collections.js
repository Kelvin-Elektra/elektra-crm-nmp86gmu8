migrate(
  (app) => {
    const companiesId = app.findCollectionByNameOrId('companies').id
    const rule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    const adminRule =
      "@request.auth.id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'admin_elektra' || @request.auth.role = 'admin_company')"

    const pv_distributors = new Collection({
      name: 'pv_distributors',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'cnpj', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_distributors_company ON pv_distributors (company_id)'],
    })
    app.save(pv_distributors)

    const pv_modules = new Collection({
      name: 'pv_modules',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        {
          name: 'distributor_id',
          type: 'relation',
          required: true,
          collectionId: pv_distributors.id,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'power', type: 'number', required: true },
        { name: 'brand', type: 'text', required: true },
        { name: 'height', type: 'number' },
        { name: 'width', type: 'number' },
        { name: 'frame', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_modules_company ON pv_modules (company_id)'],
    })
    app.save(pv_modules)

    const pv_inverters = new Collection({
      name: 'pv_inverters',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        {
          name: 'distributor_id',
          type: 'relation',
          required: true,
          collectionId: pv_distributors.id,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'power', type: 'number', required: true },
        { name: 'brand', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['monofásico', 'trifásico'],
          maxSelect: 1,
        },
        { name: 'voltage', type: 'text' },
        { name: 'warranty', type: 'text' },
        { name: 'obs', type: 'text' },
        { name: 'overload', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_inverters_company ON pv_inverters (company_id)'],
    })
    app.save(pv_inverters)

    const pv_installations = new Collection({
      name: 'pv_installations',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'purlin_type', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_installations_company ON pv_installations (company_id)'],
    })
    app.save(pv_installations)

    const pv_supplies = new Collection({
      name: 'pv_supplies',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true },
        {
          name: 'calc_base',
          type: 'select',
          values: ['modules', 'inverters', 'kwp', 'fixed'],
          maxSelect: 1,
          required: true,
        },
        { name: 'multiplier', type: 'number', required: true },
        {
          name: 'installation_id',
          type: 'relation',
          collectionId: pv_installations.id,
          maxSelect: 1,
        },
        {
          name: 'range_type',
          type: 'select',
          values: ['modules', 'kwp', 'none'],
          maxSelect: 1,
          required: true,
        },
        { name: 'max_val', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_supplies_company ON pv_supplies (company_id)'],
    })
    app.save(pv_supplies)

    const pv_costs = new Collection({
      name: 'pv_costs',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: adminRule,
      updateRule: adminRule,
      deleteRule: adminRule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'range_type',
          type: 'select',
          required: true,
          values: ['modules', 'kwp', 'kw', 'none'],
          maxSelect: 1,
        },
        { name: 'min_val', type: 'number' },
        { name: 'max_val', type: 'number' },
        {
          name: 'calc_method',
          type: 'select',
          required: true,
          values: ['fixed', 'variable', 'rate', 'tax', 'margin'],
          maxSelect: 1,
        },
        { name: 'value', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pv_costs_company ON pv_costs (company_id)'],
    })
    app.save(pv_costs)

    // Update proposal_settings to include billing_model
    const proposalSettings = app.findCollectionByNameOrId('proposal_settings')
    if (!proposalSettings.fields.getByName('billing_model')) {
      proposalSettings.fields.add(
        new SelectField({
          name: 'billing_model',
          values: ['direct', 'intermediated'],
          maxSelect: 1,
        }),
      )
      app.save(proposalSettings)
    }
  },
  (app) => {
    const cols = [
      'pv_costs',
      'pv_supplies',
      'pv_installations',
      'pv_inverters',
      'pv_modules',
      'pv_distributors',
    ]
    for (const c of cols) {
      try {
        const col = app.findCollectionByNameOrId(c)
        app.delete(col)
      } catch (_) {}
    }
  },
)
