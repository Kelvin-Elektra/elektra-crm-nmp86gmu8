migrate(
  (app) => {
    const UTILITIES = [
      { s: 'AC', n: 'Energisa Acre' },
      { s: 'AL', n: 'Equatorial Alagoas' },
      { s: 'AM', n: 'Amazonina Energia' },
      { s: 'AP', n: 'Equatorial Amapá' },
      { s: 'BA', n: 'Neoenergia Coelba' },
      { s: 'CE', n: 'Enel Ceará' },
      { s: 'DF', n: 'Neoenergia Brasília' },
      { s: 'ES', n: 'EDP Espírito Santo' },
      { s: 'GO', n: 'Enel Goiás' },
      { s: 'MA', n: 'Equatorial Maranhão' },
      { s: 'MT', n: 'ENERGISA MT' },
      { s: 'MS', n: 'Energisa MS' },
      { s: 'MG', n: 'Cemig' },
      { s: 'PA', n: 'Equatorial Pará' },
      { s: 'PB', n: 'Energisa Paraíba' },
      { s: 'PR', n: 'Copel' },
      { s: 'PE', n: 'Neoenergia Pernambuco' },
      { s: 'PI', n: 'Equatorial Piauí' },
      { s: 'RJ', n: 'Light' },
      { s: 'RN', n: 'Neoenergia Cosern' },
      { s: 'RO', n: 'Energisa Rondônia' },
      { s: 'RR', n: 'Amapá Energia' },
      { s: 'SC', n: 'Celesc' },
      { s: 'SP', n: 'Enel SP' },
      { s: 'SP', n: 'CPFL Paulista' },
      { s: 'SP', n: 'CPFL Piratininga' },
      { s: 'SE', n: 'Energisa Sergipe' },
      { s: 'TO', n: 'Energisa Tocantins' },
    ]

    try {
      const adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'elektraengenhariasolucoes@gmail.com',
      )
      const companyId = adminUser.get('company_id')
      if (!companyId) return

      const col = app.findCollectionByNameOrId('pv_distributors')

      for (const u of UTILITIES) {
        try {
          app.findFirstRecordByFilter(
            'pv_distributors',
            `name = {:name} && company_id = {:company}`,
            {
              name: u.n,
              company: companyId,
            },
          )
        } catch (_) {
          const record = new Record(col)
          record.set('name', u.n)
          record.set('company_id', companyId)
          app.save(record)
        }
      }
    } catch (_) {
      // skip if admin user not found or error
    }
  },
  (app) => {
    // no-op down for simple data seeding
  },
)
