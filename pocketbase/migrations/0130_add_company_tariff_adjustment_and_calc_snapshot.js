migrate(
  (app) => {
    // 1. Campo global por companhia "annual_tariff_adjustment" (Reajuste tarifário anual médio %) em companies
    const compCol = app.findCollectionByNameOrId('companies')
    if (!compCol.fields.getByName('annual_tariff_adjustment')) {
      compCol.fields.add(
        new NumberField({
          name: 'annual_tariff_adjustment',
          required: false,
          min: 0,
          max: 100,
        }),
      )
      app.save(compCol)
    }

    // 2. Garantir sincronização inicial com proposal_settings caso já existisse default_tariff_adjustment
    try {
      const companies = app.findRecordsByFilter('companies', '1=1', '', 500, 0)
      for (const comp of companies) {
        try {
          const setting = app.findFirstRecordByData('proposal_settings', 'company_id', comp.id)
          const defAdj = setting.get('default_tariff_adjustment')
          if (defAdj !== null && defAdj !== undefined && !comp.get('annual_tariff_adjustment')) {
            comp.set('annual_tariff_adjustment', Number(defAdj))
            app.save(comp)
          }
        } catch (_) {}
      }
    } catch (e) {
      console.log('Aviso ao sincronizar annual_tariff_adjustment em companies:', e)
    }

    // 3. Campos de snapshot na coleção proposals para dados de cálculo congelados
    const propCol = app.findCollectionByNameOrId('proposals')
    if (!propCol.fields.getByName('calc_snapshot')) {
      propCol.fields.add(
        new JSONField({
          name: 'calc_snapshot',
          required: false,
        }),
      )
      app.save(propCol)
    }
  },
  (app) => {
    try {
      const compCol = app.findCollectionByNameOrId('companies')
      if (compCol.fields.getByName('annual_tariff_adjustment')) {
        compCol.fields.removeByName('annual_tariff_adjustment')
        app.save(compCol)
      }
    } catch (_) {}

    try {
      const propCol = app.findCollectionByNameOrId('proposals')
      if (propCol.fields.getByName('calc_snapshot')) {
        propCol.fields.removeByName('calc_snapshot')
        app.save(propCol)
      }
    } catch (_) {}
  },
)
