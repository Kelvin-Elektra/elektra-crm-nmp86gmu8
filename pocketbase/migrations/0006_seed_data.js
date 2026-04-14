migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId('companies')
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const leads = app.findCollectionByNameOrId('leads')
    const negotiations = app.findCollectionByNameOrId('negotiations')
    const proposals = app.findCollectionByNameOrId('proposals')

    let c1, c2
    try {
      c1 = app.findFirstRecordByData('companies', 'name', 'Elektra Engenharia & Soluções')
    } catch (_) {
      c1 = new Record(companies)
      c1.set('name', 'Elektra Engenharia & Soluções')
      c1.set('status', 'active')
      app.save(c1)
    }

    try {
      c2 = app.findFirstRecordByData('companies', 'name', 'Empresa Teste Solar')
    } catch (_) {
      c2 = new Record(companies)
      c2.set('name', 'Empresa Teste Solar')
      c2.set('status', 'active')
      app.save(c2)
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'elektraengenhariasolucoes@gmail.com')
    } catch (_) {
      const u1 = new Record(users)
      u1.setEmail('elektraengenhariasolucoes@gmail.com')
      u1.setPassword('Skip@Pass')
      u1.setVerified(true)
      u1.set('name', 'Admin Elektra')
      u1.set('role', 'admin_elektra')
      u1.set('status', 'active')
      u1.set('company_id', c1.id)
      app.save(u1)
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'empresa@teste.com.br')
    } catch (_) {
      const u2 = new Record(users)
      u2.setEmail('empresa@teste.com.br')
      u2.setPassword('Skip@Pass')
      u2.setVerified(true)
      u2.set('name', 'Admin Company')
      u2.set('role', 'admin_company')
      u2.set('status', 'active')
      u2.set('company_id', c2.id)
      app.save(u2)
    }

    try {
      app.findFirstRecordByData('leads', 'email', 'joao@exemplo.com')
    } catch (_) {
      const l1 = new Record(leads)
      l1.set('company_id', c2.id)
      l1.set('name', 'João da Silva')
      l1.set('document', '123.456.789-00')
      l1.set('email', 'joao@exemplo.com')
      l1.set('phone', '11999999999')
      app.save(l1)

      const n1 = new Record(negotiations)
      n1.set('company_id', c2.id)
      n1.set('lead_id', l1.id)
      n1.set('title', 'Sistema Residencial 5kWp')
      n1.set('stage', 'contact')
      n1.set('concessionaire', 'Enel')
      n1.set('uc', '12345678')
      n1.set('address', 'Rua das Flores, 123')
      n1.set('avg_consumption', 500)
      n1.set('tags', ['residencial', 'urgente'])
      app.save(n1)

      const p1 = new Record(proposals)
      p1.set('company_id', c2.id)
      p1.set('negotiation_id', n1.id)
      p1.set('description', 'Proposta Inicial')
      p1.set('kit_details', '10 Placas 500W, Inversor 5kW')
      p1.set('price', 15000)
      p1.set('payment_terms', 'A vista')
      p1.set('status', 'pending')
      app.save(p1)
    }
  },
  (app) => {},
)
