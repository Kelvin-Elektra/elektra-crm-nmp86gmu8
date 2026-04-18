migrate(
  (app) => {
    const companiesId = app.findCollectionByNameOrId('companies').id
    const rule = "@request.auth.id != '' && company_id = @request.auth.company_id"

    const pv_distributors = new Collection({
      name: 'pv_distributors',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
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
    })
    app.save(pv_distributors)

    const pv_modules = new Collection({
      name: 'pv_modules',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
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
        { name: 'dimensions', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pv_modules)

    const pv_inverters = new Collection({
      name: 'pv_inverters',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
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
        { name: 'type', type: 'select', required: true, values: ['monofásico', 'trifásico'] },
        { name: 'voltage', type: 'text' },
        { name: 'warranty', type: 'text' },
        { name: 'obs', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pv_inverters)

    const pv_installations = new Collection({
      name: 'pv_installations',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
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
    })
    app.save(pv_installations)

    const pv_supplies = new Collection({
      name: 'pv_supplies',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pv_supplies)

    const pv_supply_rules = new Collection({
      name: 'pv_supply_rules',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: companiesId,
          maxSelect: 1,
        },
        {
          name: 'supply_id',
          type: 'relation',
          required: true,
          collectionId: pv_supplies.id,
          maxSelect: 1,
        },
        {
          name: 'installation_id',
          type: 'relation',
          required: true,
          collectionId: pv_installations.id,
          maxSelect: 1,
        },
        { name: 'multiplier', type: 'number', required: true },
        { name: 'base', type: 'text', required: true },
        { name: 'max_modules', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pv_supply_rules)

    const pv_costs = new Collection({
      name: 'pv_costs',
      type: 'base',
      listRule: rule,
      viewRule: rule,
      createRule: rule,
      updateRule: rule,
      deleteRule: rule,
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
        },
        { name: 'min_val', type: 'number' },
        { name: 'max_val', type: 'number' },
        {
          name: 'calc_method',
          type: 'select',
          required: true,
          values: ['fixed', 'markup', 'inside', 'rate'],
        },
        { name: 'value', type: 'number', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(pv_costs)
  },
  (app) => {
    const cols = [
      'pv_costs',
      'pv_supply_rules',
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
