migrate(
  (app) => {
    const collections = ['leads', 'pipeline_stages', 'tags']
    const newRule =
      "@request.auth.role = 'User_elektra' || (company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.createRule = newRule
        col.updateRule = newRule
        col.deleteRule = newRule
        app.save(col)
      } catch (err) {
        console.log(`Error updating ${name}: ${err.message}`)
      }
    }
  },
  (app) => {
    const collections = ['leads', 'pipeline_stages', 'tags']
    const oldRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.createRule = oldRule
        col.updateRule = oldRule
        col.deleteRule = oldRule
        app.save(col)
      } catch (err) {}
    }
  },
)
