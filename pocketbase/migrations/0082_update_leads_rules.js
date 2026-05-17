migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    col.listRule =
      "(@request.auth.role = 'User_elektra') || (company_id = @request.auth.company_id && (owner_id = @request.auth.id || @request.auth.role_company = 'admin'))"
    col.viewRule =
      "(@request.auth.role = 'User_elektra') || (company_id = @request.auth.company_id && (owner_id = @request.auth.id || @request.auth.role_company = 'admin'))"
    col.createRule =
      "(@request.auth.role = 'User_elektra') || (company_id != '' && company_id = @request.auth.company_id && owner_id = @request.auth.id)"
    col.updateRule =
      "(@request.auth.role = 'User_elektra') || (company_id = @request.auth.company_id && (owner_id = @request.auth.id || @request.auth.role_company = 'admin'))"
    col.deleteRule =
      "(@request.auth.role = 'User_elektra') || (company_id = @request.auth.company_id && (owner_id = @request.auth.id || @request.auth.role_company = 'admin'))"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')

    col.listRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
    col.viewRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
    col.createRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
    col.updateRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"
    col.deleteRule = "@request.auth.role = 'User_elektra' || company_id = @request.auth.company_id"

    app.save(col)
  },
)
