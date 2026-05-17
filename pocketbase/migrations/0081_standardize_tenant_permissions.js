migrate(
  (app) => {
    const collections = [
      'leads',
      'negotiations',
      'proposals',
      'budgets',
      'pipeline_stages',
      'tags',
      'pv_distributors',
      'pv_modules',
      'pv_inverters',
      'pv_utilities',
    ]

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.listRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        col.viewRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        col.createRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        col.updateRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        col.deleteRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        app.saveNoValidate(col)
      } catch (e) {
        console.log('Migration error for ' + name + ': ' + e.message)
      }
    }
  },
  (app) => {
    // Since rules were standardized, a rollback is simply a no-op here
    // as it is not strictly necessary or easily reconstructed from diverse past states.
  },
)
