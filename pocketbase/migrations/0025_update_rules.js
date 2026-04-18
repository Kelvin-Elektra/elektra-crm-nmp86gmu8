migrate(
  (app) => {
    const leads = app.findCollectionByNameOrId('leads')
    leads.listRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    leads.viewRule = "@request.auth.id != '' && company_id = @request.auth.company_id"
    app.save(leads)

    const neg = app.findCollectionByNameOrId('negotiations')
    const negRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"
    neg.listRule = negRule
    neg.viewRule = negRule
    neg.updateRule = negRule
    neg.deleteRule = negRule
    app.save(neg)
  },
  (app) => {
    // Revert not strictly needed for this context, but safe practice
    const leads = app.findCollectionByNameOrId('leads')
    leads.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || (@request.auth.role = 'admin_company' && company_id = @request.auth.company_id) || (@request.auth.role = 'user' && company_id = @request.auth.company_id && owner_id = @request.auth.id))"
    leads.viewRule = leads.listRule
    app.save(leads)

    const neg = app.findCollectionByNameOrId('negotiations')
    const negRule =
      "@request.auth.id != '' && (@request.auth.role = 'admin_elektra' || company_id = @request.auth.company_id)"
    neg.listRule = negRule
    neg.viewRule = negRule
    neg.updateRule = negRule
    neg.deleteRule = negRule
    app.save(neg)
  },
)
