migrate(
  (app) => {
    const companies = app.findRecordsByFilter('companies', '1=1', '', 100, 0)

    for (const company of companies) {
      const cid = company.id

      const instCol = app.findCollectionByNameOrId('pv_installations')
      const presets = ['Aluzinco', 'Telha', 'Fibrocimento', 'Eternit', 'Solo', 'Carport']
      for (const p of presets) {
        try {
          app.findFirstRecordByFilter('pv_installations', `company_id='${cid}' && name='${p}'`)
        } catch (_) {
          const r = new Record(instCol)
          r.set('company_id', cid)
          r.set('name', p)
          r.set('purlin_type', p === 'Telha' ? 'Terças de madeira' : 'Terças de metal')
          app.save(r)
        }
      }

      const costsCol = app.findCollectionByNameOrId('pv_costs')
      const costs = [
        { name: 'Instalação', calc_method: 'fixed', value: 1000 },
        { name: 'Material complementar', calc_method: 'fixed', value: 500 },
        { name: 'Imposto serviço', calc_method: 'inside', value: 5 },
        { name: 'Imposto produto', calc_method: 'inside', value: 12 },
        { name: 'Comissão', calc_method: 'inside', value: 3 },
        { name: 'Engenharia', calc_method: 'fixed', value: 800 },
        { name: 'Margem de contribuição', calc_method: 'markup', value: 20 },
      ]
      for (const c of costs) {
        try {
          app.findFirstRecordByFilter('pv_costs', `company_id='${cid}' && name='${c.name}'`)
        } catch (_) {
          const r = new Record(costsCol)
          r.set('company_id', cid)
          r.set('name', c.name)
          r.set('range_type', 'none')
          r.set('calc_method', c.calc_method)
          r.set('value', c.value)
          app.save(r)
        }
      }
    }
  },
  (app) => {
    app.db().newQuery('DELETE FROM pv_installations').execute()
    app.db().newQuery('DELETE FROM pv_costs').execute()
  },
)
