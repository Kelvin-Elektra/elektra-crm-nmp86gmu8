migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    // Ensure users can view and list their own record to allow auth-refresh to work consistently
    users.listRule =
      "@request.auth.role = 'User_elektra' || id = @request.auth.id || (company_id != '' && company_id = @request.auth.company_id)"
    users.viewRule =
      "@request.auth.role = 'User_elektra' || id = @request.auth.id || (company_id != '' && company_id = @request.auth.company_id)"
    users.updateRule =
      "@request.auth.role = 'User_elektra' || id = @request.auth.id || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role = 'User_owner' || @request.auth.role_company = 'admin'))"

    app.save(users)
  },
  (app) => {
    try {
      const users = app.findCollectionByNameOrId('users')
      users.listRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
      users.viewRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
      app.save(users)
    } catch (err) {}
  },
)
