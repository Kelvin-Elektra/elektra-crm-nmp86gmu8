migrate(
  (app) => {
    const hspData = [
      { city: 'Rio Branco', state: 'AC', annual_avg: 4.8 },
      { city: 'Maceió', state: 'AL', annual_avg: 5.3 },
      { city: 'Macapá', state: 'AP', annual_avg: 4.7 },
      { city: 'Manaus', state: 'AM', annual_avg: 4.5 },
      { city: 'Salvador', state: 'BA', annual_avg: 5.2 },
      { city: 'Fortaleza', state: 'CE', annual_avg: 5.5 },
      { city: 'Brasília', state: 'DF', annual_avg: 5.0 },
      { city: 'Vitória', state: 'ES', annual_avg: 4.9 },
      { city: 'Goiânia', state: 'GO', annual_avg: 5.1 },
      { city: 'São Luís', state: 'MA', annual_avg: 5.2 },
      { city: 'Cuiabá', state: 'MT', annual_avg: 5.0 },
      { city: 'Campo Grande', state: 'MS', annual_avg: 5.1 },
      { city: 'Belo Horizonte', state: 'MG', annual_avg: 5.3 },
      { city: 'Belém', state: 'PA', annual_avg: 4.8 },
      { city: 'João Pessoa', state: 'PB', annual_avg: 5.5 },
      { city: 'Curitiba', state: 'PR', annual_avg: 4.6 },
      { city: 'Recife', state: 'PE', annual_avg: 5.4 },
      { city: 'Teresina', state: 'PI', annual_avg: 5.4 },
      { city: 'Rio de Janeiro', state: 'RJ', annual_avg: 4.8 },
      { city: 'Natal', state: 'RN', annual_avg: 5.5 },
      { city: 'Porto Alegre', state: 'RS', annual_avg: 4.5 },
      { city: 'Porto Velho', state: 'RO', annual_avg: 4.7 },
      { city: 'Boa Vista', state: 'RR', annual_avg: 4.9 },
      { city: 'Florianópolis', state: 'SC', annual_avg: 4.4 },
      { city: 'São Paulo', state: 'SP', annual_avg: 4.6 },
      { city: 'Aracaju', state: 'SE', annual_avg: 5.3 },
      { city: 'Palmas', state: 'TO', annual_avg: 5.1 },
    ]

    const col = app.findCollectionByNameOrId('pv_hsp_data')

    for (const item of hspData) {
      try {
        app.findFirstRecordByData('pv_hsp_data', 'city', item.city)
      } catch (_) {
        const record = new Record(col)
        record.set('city', item.city)
        record.set('state', item.state)
        record.set('annual_avg', item.annual_avg)
        app.save(record)
      }
    }
  },
  (app) => {
    // Can't easily undo specific seeds without potentially deleting user data, leave empty
  },
)
