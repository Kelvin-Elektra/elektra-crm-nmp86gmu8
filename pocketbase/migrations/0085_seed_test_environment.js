migrate(
  (app) => {
    const companies = app.findCollectionByNameOrId('companies')
    const users = app.findCollectionByNameOrId('users')
    const leads = app.findCollectionByNameOrId('leads')
    const negotiations = app.findCollectionByNameOrId('negotiations')
    const pipelineStages = app.findCollectionByNameOrId('pipeline_stages')

    let company
    try {
      company = app.findFirstRecordByData('companies', 'name', 'Lab Integrador Solar')
    } catch (_) {
      company = new Record(companies)
      company.set('name', 'Lab Integrador Solar')
      company.set('status', 'active')
      app.save(company)
    }

    let user
    try {
      user = app.findAuthRecordByEmail('users', 'suporte.teste@elektrasolucoes.tech')
    } catch (_) {
      user = new Record(users)
      user.setEmail('suporte.teste@elektrasolucoes.tech')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Admin Teste')
      user.set('role', 'User_owner')
      user.set('role_company', 'admin')
      user.set('company_id', company.id)
      user.set('status', 'active')
      app.save(user)
    }

    let stage
    try {
      stage = app.findFirstRecordByFilter(
        'pipeline_stages',
        `name = 'Prospecção' && company_id = '${company.id}'`,
      )
    } catch (_) {
      stage = new Record(pipelineStages)
      stage.set('name', 'Prospecção')
      stage.set('order', 1)
      stage.set('company_id', company.id)
      app.save(stage)
    }

    const leadsData = [
      { name: 'Lead Teste A', email: 'a@teste.com', phone: '11999999991' },
      { name: 'Lead Teste B', email: 'b@teste.com', phone: '11999999992' },
      { name: 'Lead Teste C', email: 'c@teste.com', phone: '11999999993' },
    ]

    const leadRecords = []
    for (const lData of leadsData) {
      let lead
      try {
        const filter = `name = '${lData.name}' && company_id = '${company.id}'`
        lead = app.findFirstRecordByFilter('leads', filter)
      } catch (_) {
        lead = new Record(leads)
        lead.set('name', lData.name)
        lead.set('email', lData.email)
        lead.set('phone', lData.phone)
        lead.set('company_id', company.id)
        lead.set('owner_id', user.id)
        app.save(lead)
      }
      leadRecords.push(lead)
    }

    const negsData = [
      { title: 'Projeto Residencial Teste', stage: stage.id, lead_id: leadRecords[0].id },
      { title: 'Projeto Industrial Teste', stage: stage.id, lead_id: leadRecords[1].id },
    ]

    for (const nData of negsData) {
      try {
        const filter = `title = '${nData.title}' && company_id = '${company.id}'`
        app.findFirstRecordByFilter('negotiations', filter)
      } catch (_) {
        const neg = new Record(negotiations)
        neg.set('title', nData.title)
        neg.set('stage', nData.stage)
        neg.set('company_id', company.id)
        neg.set('lead_id', nData.lead_id)
        neg.set('owner_id', user.id)
        app.save(neg)
      }
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('users', 'suporte.teste@elektrasolucoes.tech')
      app.delete(user)
    } catch (_) {}

    try {
      const company = app.findFirstRecordByData('companies', 'name', 'Lab Integrador Solar')

      try {
        const negs = app.findRecordsByFilter(
          'negotiations',
          `company_id = '${company.id}'`,
          '',
          100,
          0,
        )
        for (const neg of negs) {
          app.delete(neg)
        }
      } catch (_) {}

      try {
        const leadsList = app.findRecordsByFilter(
          'leads',
          `company_id = '${company.id}'`,
          '',
          100,
          0,
        )
        for (const lead of leadsList) {
          app.delete(lead)
        }
      } catch (_) {}

      try {
        const stages = app.findRecordsByFilter(
          'pipeline_stages',
          `company_id = '${company.id}'`,
          '',
          100,
          0,
        )
        for (const stage of stages) {
          app.delete(stage)
        }
      } catch (_) {}

      app.delete(company)
    } catch (_) {}
  },
)
