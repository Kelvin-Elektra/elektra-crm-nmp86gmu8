migrate(
  (app) => {
    const collectionsToUpdate = [
      {
        name: 'companies',
        rules: {
          listRule: "@request.auth.role = 'User_elektra' || id = @request.auth.company_id",
          viewRule: "@request.auth.role = 'User_elektra' || id = @request.auth.company_id",
          createRule: "@request.auth.role = 'User_elektra'",
          updateRule:
            "@request.auth.role = 'User_elektra' || (id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))",
          deleteRule: "@request.auth.role = 'User_elektra'",
        },
      },
      {
        name: 'leads',
        rules: {
          listRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          viewRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          createRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          updateRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          deleteRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
        },
      },
      {
        name: 'negotiations',
        rules: {
          listRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          viewRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          createRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          updateRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
          deleteRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || owner_id = @request.auth.id))",
        },
      },
      {
        name: 'users',
        rules: {
          listRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          viewRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          createRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))",
          updateRule:
            "@request.auth.role = 'User_elektra' || id = @request.auth.id || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))",
          deleteRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin') && id != @request.auth.id)",
        },
      },
    ]

    const standardCollections = [
      'proposals',
      'budgets',
      'tags',
      'pipeline_stages',
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

    for (const name of standardCollections) {
      collectionsToUpdate.push({
        name,
        rules: {
          listRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          viewRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          createRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          updateRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
          deleteRule:
            "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))",
        },
      })
    }

    for (const item of collectionsToUpdate) {
      try {
        const col = app.findCollectionByNameOrId(item.name)
        col.listRule = item.rules.listRule
        col.viewRule = item.rules.viewRule
        col.createRule = item.rules.createRule
        col.updateRule = item.rules.updateRule
        col.deleteRule = item.rules.deleteRule
        app.save(col)
      } catch (_) {
        // ignore missing collections
      }
    }
  },
  (app) => {
    // Empty down migration
  },
)
