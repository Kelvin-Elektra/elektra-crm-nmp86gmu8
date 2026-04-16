migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_')

    collection.listRule =
      "id = @request.auth.id || @request.auth.role = 'admin_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
    collection.viewRule =
      "id = @request.auth.id || @request.auth.role = 'admin_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
    collection.createRule =
      "@request.auth.role = 'admin_elektra' || @request.auth.role = 'admin_company'"
    collection.updateRule =
      "id = @request.auth.id || @request.auth.role = 'admin_elektra' || (company_id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin_company')"
    collection.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'admin_elektra' || (company_id != '' && company_id = @request.auth.company_id && @request.auth.role = 'admin_company')"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('_pb_users_auth_')

    collection.listRule = 'id = @request.auth.id'
    collection.viewRule = 'id = @request.auth.id'
    collection.createRule = ''
    collection.updateRule = 'id = @request.auth.id'
    collection.deleteRule = 'id = @request.auth.id'

    app.save(collection)
  },
)
