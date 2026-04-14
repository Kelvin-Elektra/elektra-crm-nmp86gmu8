migrate(
  (app) => {
    const companies = app.findRecordsByFilter('companies', '1=1', '', 100, 0)
    for (const comp of companies) {
      if (!comp.getString('domain')) {
        const name = comp
          .getString('name')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
        comp.set('domain', `${name}.com`)
        app.saveNoValidate(comp)
      }
    }

    try {
      const admin = app.findAuthRecordByEmail('users', 'elektraengenhariasolucoes@gmail.com')
      let elektraCompany
      try {
        elektraCompany = app.findFirstRecordByData('companies', 'name', 'Elektra')
      } catch (_) {
        const col = app.findCollectionByNameOrId('companies')
        elektraCompany = new Record(col)
        elektraCompany.set('name', 'Elektra')
        elektraCompany.set('status', 'active')
        elektraCompany.set('domain', 'elektra.com')
        elektraCompany.set('max_users', 10)
        app.save(elektraCompany)
      }

      if (!admin.getString('company_id') && elektraCompany) {
        admin.set('company_id', elektraCompany.id)
        app.saveNoValidate(admin)
      }
    } catch (_) {
      const users = app.findCollectionByNameOrId('users')
      const admin = new Record(users)
      admin.setEmail('elektraengenhariasolucoes@gmail.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Admin Elektra')
      admin.set('role', 'admin_company')
      admin.set('status', 'active')

      let elektraCompany
      try {
        elektraCompany = app.findFirstRecordByData('companies', 'name', 'Elektra')
      } catch (_) {
        const col = app.findCollectionByNameOrId('companies')
        elektraCompany = new Record(col)
        elektraCompany.set('name', 'Elektra')
        elektraCompany.set('status', 'active')
        elektraCompany.set('domain', 'elektra.com')
        elektraCompany.set('max_users', 10)
        app.save(elektraCompany)
      }

      if (elektraCompany) {
        admin.set('company_id', elektraCompany.id)
      }
      app.save(admin)
    }
  },
  (app) => {},
)
