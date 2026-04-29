migrate(
  (app) => {
    const adminEmail = 'elektraengenhariasolucoes@gmail.com'
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
      const companyId = admin.getString('company_id')
      if (companyId) {
        const utilities = ['Copel', 'Celesc', 'CPFL Paulista', 'Enel SP', 'Neoenergia Coelba']
        const utilCol = app.findCollectionByNameOrId('pv_utilities')

        for (const u of utilities) {
          try {
            app.findFirstRecordByData('pv_utilities', 'name', u)
          } catch (_) {
            const record = new Record(utilCol)
            record.set('name', u)
            record.set('company_id', companyId)
            app.save(record)
          }
        }
      }
    } catch (_) {
      console.log('Admin user not found, skipping utility seed.')
    }
  },
  (app) => {},
)
