migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role_text')) {
      users.fields.add(new TextField({ name: 'role_text' }))
    }
    if (!users.fields.getByName('role_company')) {
      users.fields.add(new TextField({ name: 'role_company' }))
    }
    app.save(users)

    app
      .db()
      .newQuery("UPDATE users SET role_text = 'User_elektra' WHERE role = 'admin_elektra'")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE users SET role_text = 'User_owner', role_company = 'admin' WHERE role = 'admin_company'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE users SET role_text = 'User_employee', role_company = 'user' WHERE role = 'user'",
      )
      .execute()

    const usersAgain = app.findCollectionByNameOrId('users')
    usersAgain.fields.removeByName('role')
    usersAgain.fields.removeByName('is_owner')
    const roleText = usersAgain.fields.getByName('role_text')
    roleText.name = 'role'
    app.save(usersAgain)

    const companies = app.findCollectionByNameOrId('companies')
    companies.fields.removeByName('max_users')
    app.save(companies)

    const colNames = [
      'users',
      'companies',
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
      'system_settings',
      'pv_efficiency_rules',
    ]

    for (const name of colNames) {
      try {
        const col = app.findCollectionByNameOrId(name)
        let changed = false
        const rules = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']
        for (const rule of rules) {
          if (col[rule]) {
            let newRule = col[rule]
              .replace(
                /@request\.auth\.role = 'admin_elektra'/g,
                "@request.auth.role = 'User_elektra'",
              )
              .replace(
                /@request\.auth\.role = 'admin_company'/g,
                "@request.auth.role_company = 'admin'",
              )
              .replace(/@request\.auth\.role = 'user'/g, "@request.auth.role_company = 'user'")
            if (newRule !== col[rule]) {
              col[rule] = newRule
              changed = true
            }
          }
        }
        if (changed) {
          app.save(col)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
