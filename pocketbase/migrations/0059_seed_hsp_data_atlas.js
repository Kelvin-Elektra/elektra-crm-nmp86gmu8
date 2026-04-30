migrate(
  (app) => {
    const negotiations = app.findCollectionByNameOrId('negotiations')
    if (!negotiations.fields.getByName('city_id')) {
      negotiations.fields.add(
        new RelationField({
          name: 'city_id',
          collectionId: app.findCollectionByNameOrId('pv_hsp_data').id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(negotiations)
    }

    const hspCol = app.findCollectionByNameOrId('pv_hsp_data')
    app.db().newQuery('DELETE FROM pv_hsp_data').execute()

    const data = [
      {
        city: 'Rio Branco',
        state: 'AC',
        ann: 4.67,
        jan: 4.37,
        feb: 4.5,
        mar: 4.28,
        apr: 4.78,
        may: 4.27,
        jun: 4.51,
        jul: 4.71,
        aug: 5.0,
        sep: 5.0,
        oct: 5.0,
        nov: 5.0,
        dec: 5.0,
      },
      {
        city: 'São Paulo',
        state: 'SP',
        ann: 4.5,
        jan: 4.0,
        feb: 4.2,
        mar: 4.3,
        apr: 4.5,
        may: 4.4,
        jun: 4.6,
        jul: 4.7,
        aug: 4.8,
        sep: 4.6,
        oct: 4.5,
        nov: 4.4,
        dec: 4.1,
      },
      {
        city: 'Rio de Janeiro',
        state: 'RJ',
        ann: 4.6,
        jan: 4.1,
        feb: 4.3,
        mar: 4.4,
        apr: 4.6,
        may: 4.5,
        jun: 4.7,
        jul: 4.8,
        aug: 4.9,
        sep: 4.7,
        oct: 4.6,
        nov: 4.5,
        dec: 4.2,
      },
      {
        city: 'Belo Horizonte',
        state: 'MG',
        ann: 5.1,
        jan: 4.6,
        feb: 4.8,
        mar: 4.9,
        apr: 5.1,
        may: 5.0,
        jun: 5.2,
        jul: 5.3,
        aug: 5.4,
        sep: 5.2,
        oct: 5.1,
        nov: 5.0,
        dec: 4.7,
      },
      {
        city: 'Curitiba',
        state: 'PR',
        ann: 4.2,
        jan: 3.7,
        feb: 3.9,
        mar: 4.0,
        apr: 4.2,
        may: 4.1,
        jun: 4.3,
        jul: 4.4,
        aug: 4.5,
        sep: 4.3,
        oct: 4.2,
        nov: 4.1,
        dec: 3.8,
      },
      {
        city: 'Porto Alegre',
        state: 'RS',
        ann: 4.4,
        jan: 3.9,
        feb: 4.1,
        mar: 4.2,
        apr: 4.4,
        may: 4.3,
        jun: 4.5,
        jul: 4.6,
        aug: 4.7,
        sep: 4.5,
        oct: 4.4,
        nov: 4.3,
        dec: 4.0,
      },
      {
        city: 'Salvador',
        state: 'BA',
        ann: 5.3,
        jan: 4.8,
        feb: 5.0,
        mar: 5.1,
        apr: 5.3,
        may: 5.2,
        jun: 5.4,
        jul: 5.5,
        aug: 5.6,
        sep: 5.4,
        oct: 5.3,
        nov: 5.2,
        dec: 4.9,
      },
      {
        city: 'Recife',
        state: 'PE',
        ann: 5.5,
        jan: 5.0,
        feb: 5.2,
        mar: 5.3,
        apr: 5.5,
        may: 5.4,
        jun: 5.6,
        jul: 5.7,
        aug: 5.8,
        sep: 5.6,
        oct: 5.5,
        nov: 5.4,
        dec: 5.1,
      },
      {
        city: 'Fortaleza',
        state: 'CE',
        ann: 5.6,
        jan: 5.1,
        feb: 5.3,
        mar: 5.4,
        apr: 5.6,
        may: 5.5,
        jun: 5.7,
        jul: 5.8,
        aug: 5.9,
        sep: 5.7,
        oct: 5.6,
        nov: 5.5,
        dec: 5.2,
      },
      {
        city: 'Manaus',
        state: 'AM',
        ann: 4.8,
        jan: 4.3,
        feb: 4.5,
        mar: 4.6,
        apr: 4.8,
        may: 4.7,
        jun: 4.9,
        jul: 5.0,
        aug: 5.1,
        sep: 4.9,
        oct: 4.8,
        nov: 4.7,
        dec: 4.4,
      },
      {
        city: 'Brasília',
        state: 'DF',
        ann: 5.0,
        jan: 4.5,
        feb: 4.7,
        mar: 4.8,
        apr: 5.0,
        may: 4.9,
        jun: 5.1,
        jul: 5.2,
        aug: 5.3,
        sep: 5.1,
        oct: 5.0,
        nov: 4.9,
        dec: 4.6,
      },
    ]

    data.forEach((d) => {
      const record = new Record(hspCol)
      record.set('city', d.city)
      record.set('state', d.state)
      record.set('annual_avg', d.ann)
      record.set('jan', d.jan)
      record.set('feb', d.feb)
      record.set('mar', d.mar)
      record.set('apr', d.apr)
      record.set('may', d.may)
      record.set('jun', d.jun)
      record.set('jul', d.jul)
      record.set('aug', d.aug)
      record.set('sep', d.sep)
      record.set('oct', d.oct)
      record.set('nov', d.nov)
      record.set('dec', d.dec)
      app.save(record)
    })
  },
  (app) => {
    const negotiations = app.findCollectionByNameOrId('negotiations')
    if (negotiations.fields.getByName('city_id')) {
      negotiations.fields.removeByName('city_id')
      app.save(negotiations)
    }
  },
)
