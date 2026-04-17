migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')

    if (!leads.fields.getByName('owner_id')) {
      leads.fields.add(
        new RelationField({
          name: 'owner_id',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    leads.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"
    leads.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"
    leads.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"
    leads.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"

    app.save(leads)
  },
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    leads.fields.removeByName('owner_id')
    leads.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)"
    leads.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)"
    leads.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)"
    leads.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)"
    app.save(leads)
  },
)
