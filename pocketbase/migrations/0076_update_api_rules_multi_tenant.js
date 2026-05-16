migrate(
  (app) => {
    // Add phone to users if it doesn't exist
    const usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('phone')) {
      usersCol.fields.add(new TextField({ name: 'phone', required: false }))
    }

    usersCol.listRule =
      "id = @request.auth.id || @request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && @request.auth.role_company = 'admin')"
    usersCol.viewRule =
      "id = @request.auth.id || @request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && @request.auth.role_company = 'admin')"
    usersCol.updateRule =
      "id = @request.auth.id || @request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && @request.auth.role_company = 'admin')"
    app.save(usersCol)

    // Update companies rules
    const compCol = app.findCollectionByNameOrId('companies')
    compCol.listRule = "id = @request.auth.company_id || @request.auth.role = 'User_elektra'"
    compCol.viewRule = "id = @request.auth.company_id || @request.auth.role = 'User_elektra'"
    compCol.updateRule =
      "(id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin')) || @request.auth.role = 'User_elektra'"
    app.save(compCol)

    // General multi-tenant collections
    const collectionsToUpdate = [
      'leads',
      'negotiations',
      'proposals',
      'pipeline_stages',
      'tags',
      'budgets',
      'proposal_settings',
      'pv_distributors',
      'pv_modules',
      'pv_inverters',
      'pv_installations',
      'pv_supplies',
      'pv_costs',
      'pv_supply_rules',
      'pv_tariff_rules',
      'pv_utilities',
      'pv_efficiency_rules',
    ]

    for (const name of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(name)

        if (['leads', 'negotiations'].includes(name)) {
          col.listRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && owner_id = @request.auth.id)"
          col.viewRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && owner_id = @request.auth.id)"
          col.createRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.updateRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && owner_id = @request.auth.id)"
          col.deleteRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
        } else if (name === 'proposals') {
          col.listRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && negotiation_id.owner_id = @request.auth.id)"
          col.viewRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && negotiation_id.owner_id = @request.auth.id)"
          col.createRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.updateRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner')) || (company_id = @request.auth.company_id && negotiation_id.owner_id = @request.auth.id)"
          col.deleteRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
        } else {
          col.listRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.viewRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.createRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.updateRule =
            "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
          col.deleteRule =
            "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
        }
        app.save(col)
      } catch (_) {}
    }
  },
  (app) => {
    // Empty down migration
  },
)
