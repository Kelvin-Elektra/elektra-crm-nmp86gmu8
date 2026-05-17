migrate(
  (app) => {
    const rules = {
      leads: {
        list: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        view: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        create:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        update:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        delete:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
      },
      negotiations: {
        list: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        view: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        create:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || owner_id = @request.auth.id))",
        update:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || owner_id = @request.auth.id))",
        delete:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || owner_id = @request.auth.id))",
      },
      proposals: {
        list: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        view: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        create:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        update:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        delete:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
      },
      budgets: {
        list: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        view: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        create:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        update:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
        delete:
          "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))",
      },
    }

    const supporting = [
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

    for (const name of supporting) {
      rules[name] = {
        list: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
        view: "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)",
      }
    }

    for (const [name, ruleSet] of Object.entries(rules)) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (ruleSet.list !== undefined) col.listRule = ruleSet.list
        if (ruleSet.view !== undefined) col.viewRule = ruleSet.view
        if (ruleSet.create !== undefined) col.createRule = ruleSet.create
        if (ruleSet.update !== undefined) col.updateRule = ruleSet.update
        if (ruleSet.delete !== undefined) col.deleteRule = ruleSet.delete
        app.save(col)
      } catch (err) {
        console.log('Collection ' + name + ' not found, skipping.')
      }
    }
  },
  (app) => {
    // Safe down migration placeholder to prevent apply errors.
    console.log(
      'Revert for standardize_api_rules_v2 not implemented to avoid breaking existing data constraints.',
    )
  },
)
