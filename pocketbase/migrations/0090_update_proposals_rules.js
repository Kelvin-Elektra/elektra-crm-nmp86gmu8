migrate(
  (app) => {
    const proposals = app.findCollectionByNameOrId('proposals')

    // Ensure the rules strictly allow User_elektra maintainers to view across companies
    proposals.listRule =
      "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
    proposals.viewRule =
      "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"

    app.save(proposals)
  },
  (app) => {
    // Revert not required as this enforces standard CRM tenant rules
  },
)
