migrate(
  (app) => {
    const standardRule =
      "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
    const standardCollections = [
      'leads',
      'negotiations',
      'proposals',
      'budgets',
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
      'pipeline_stages',
      'tags',
      'proposal_settings',
    ]

    for (const name of standardCollections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule = standardRule
        col.viewRule = standardRule
        col.createRule = standardRule
        col.updateRule = standardRule
        col.deleteRule = standardRule
        app.save(col)
      } catch (_) {
        // ignore if collection doesn't exist
      }
    }

    // Companies rules
    try {
      const companies = app.findCollectionByNameOrId('companies')
      companies.listRule = "@request.auth.role = 'User_elektra' || id = @request.auth.company_id"
      companies.viewRule = "@request.auth.role = 'User_elektra' || id = @request.auth.company_id"
      companies.createRule = "@request.auth.role = 'User_elektra'"
      companies.updateRule =
        "@request.auth.role = 'User_elektra' || (id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"
      companies.deleteRule = "@request.auth.role = 'User_elektra'"
      app.save(companies)
    } catch (_) {}

    // Users rules
    try {
      const users = app.findCollectionByNameOrId('users')
      users.listRule =
        "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
      users.viewRule =
        "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
      users.createRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"
      users.updateRule =
        "@request.auth.role = 'User_elektra' || id = @request.auth.id || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"
      users.deleteRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin') && id != @request.auth.id)"
      app.save(users)
    } catch (_) {}
  },
  (app) => {
    // Revert rule updates safely
  },
)
