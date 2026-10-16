migrate(
  (app) => {
    // 1. Atualizar regras de proposals (create, update, delete)
    // Permitir User_elektra, admin da empresa, owner da empresa, OU dono (owner_id) da negociação vinculada
    try {
      const proposals = app.findCollectionByNameOrId('proposals')
      proposals.createRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      proposals.updateRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      proposals.deleteRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      app.save(proposals)
    } catch (err) {
      console.log('Erro ao atualizar regras de proposals:', err)
      throw err
    }

    // 2. Atualizar regras de financing_simulations (create, update, delete)
    // Aplicar a mesma lógica para quem pode mexer na negociação poder mexer nos financiamentos dela
    try {
      const financingSimulations = app.findCollectionByNameOrId('financing_simulations')
      financingSimulations.createRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      financingSimulations.updateRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      financingSimulations.deleteRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner' || negotiation_id.owner_id = @request.auth.id))"
      app.save(financingSimulations)
    } catch (err) {
      console.log('Erro ao atualizar regras de financing_simulations:', err)
      throw err
    }
  },
  (app) => {
    try {
      const proposals = app.findCollectionByNameOrId('proposals')
      proposals.createRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
      proposals.updateRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
      proposals.deleteRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
      app.save(proposals)
    } catch (_) {}

    try {
      const financingSimulations = app.findCollectionByNameOrId('financing_simulations')
      financingSimulations.createRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
      financingSimulations.updateRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id)"
      financingSimulations.deleteRule =
        "@request.auth.role = 'User_elektra' || (company_id != '' && company_id = @request.auth.company_id && (@request.auth.role_company = 'admin' || @request.auth.role = 'User_owner'))"
      app.save(financingSimulations)
    } catch (_) {}
  },
)
