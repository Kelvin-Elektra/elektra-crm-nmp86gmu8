migrate(
  (app) => {
    // 1. Campo por concessionária "annual_tariff_adjustment" (Reajuste tarifário anual médio %) em pv_utilities
    const utilCol = app.findCollectionByNameOrId('pv_utilities')
    if (!utilCol.fields.getByName('annual_tariff_adjustment')) {
      utilCol.fields.add(
        new NumberField({
          name: 'annual_tariff_adjustment',
          required: false,
          min: 0,
          max: 100,
        }),
      )
      app.save(utilCol)
    }

    // 2. Se houver concessionárias já cadastradas, herdar opcionalmente o valor de sua respectiva companhia se não estiver preenchido
    try {
      const utils = app.findRecordsByFilter('pv_utilities', '1=1', '', 500, 0)
      for (const u of utils) {
        try {
          const compId = u.get('company_id')
          if (compId) {
            const comp = app.findCollectionByNameOrId('companies')
              ? app.findFirstRecordByData('companies', 'id', compId)
              : null
            if (comp) {
              const compAdj = comp.get('annual_tariff_adjustment')
              if (
                compAdj !== null &&
                compAdj !== undefined &&
                Number(compAdj) > 0 &&
                !u.get('annual_tariff_adjustment')
              ) {
                u.set('annual_tariff_adjustment', Number(compAdj))
                app.save(u)
              }
            }
          }
        } catch (_) {}
      }
    } catch (e) {
      console.log('Aviso ao sincronizar annual_tariff_adjustment em pv_utilities:', e)
    }
  },
  (app) => {
    try {
      const utilCol = app.findCollectionByNameOrId('pv_utilities')
      if (utilCol.fields.getByName('annual_tariff_adjustment')) {
        utilCol.fields.removeByName('annual_tariff_adjustment')
        app.save(utilCol)
      }
    } catch (_) {}
  },
)
