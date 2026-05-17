migrate(
  (app) => {
    const collections = ['leads', 'pipeline_stages', 'tags', 'negotiations', 'proposals']
    const rule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        if (col) {
          col.listRule = rule
          col.viewRule = rule
          col.createRule = rule
          col.updateRule = rule
          col.deleteRule = rule
          app.save(col)
        }
      } catch (err) {
        console.log(`Error updating ${name}: ${err.message}`)
      }
    }

    try {
      const users = app.findCollectionByNameOrId('users')
      if (users) {
        const userRule =
          "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
        users.listRule = userRule
        users.viewRule = userRule
        app.save(users)
      }
    } catch (err) {}

    try {
      const companies = app.findCollectionByNameOrId('companies')
      if (companies) {
        const compRule = "@request.auth.role = 'User_elektra' || id = @request.auth.company_id"
        companies.listRule = compRule
        companies.viewRule = compRule
        app.save(companies)
      }
    } catch (err) {}
  },
  (app) => {
    // down
  },
)
