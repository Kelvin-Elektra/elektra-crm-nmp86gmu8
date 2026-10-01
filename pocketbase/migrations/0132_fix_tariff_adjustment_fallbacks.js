migrate(
  (app) => {
    // Corrigir negociações que herdaram fallback 1% indevido
    try {
      const negs = app.findRecordsByFilter(
        'negotiations',
        'annual_tariff_adjustment = 1',
        '',
        500,
        0,
      )
      for (const neg of negs) {
        const utilId = neg.get('utility_id')
        if (!utilId) continue
        try {
          const util = app.findFirstRecordByData('pv_utilities', 'id', utilId)
          const utilAdj = util.get('annual_tariff_adjustment')
          if (utilAdj !== null && utilAdj !== undefined && Number(utilAdj) > 0) {
            neg.set('annual_tariff_adjustment', Number(utilAdj))
            const sizing = neg.get('sizing') || {}
            sizing.annual_tariff_adjustment = Number(utilAdj)
            neg.set('sizing', sizing)
            app.save(neg)
          }
        } catch (_) {}
      }
    } catch (e) {
      console.log('Erro ao corrigir annual_tariff_adjustment em negotiations:', e)
    }

    // Corrigir propostas com calc_snapshot.annual_tariff_adjustment = 1 da negociação Kelvin 2
    try {
      const props = app.findRecordsByFilter('proposals', '1=1', '', 500, 0)
      for (const p of props) {
        const snap = p.get('calc_snapshot')
        if (snap && snap.annual_tariff_adjustment === 1) {
          const negId = p.get('negotiation_id')
          if (!negId) continue
          try {
            const neg = app.findFirstRecordByData('negotiations', 'id', negId)
            const utilId = neg.get('utility_id')
            if (!utilId) continue
            const util = app.findFirstRecordByData('pv_utilities', 'id', utilId)
            const utilAdj = util.get('annual_tariff_adjustment')
            if (utilAdj !== null && utilAdj !== undefined && Number(utilAdj) > 0) {
              snap.annual_tariff_adjustment = Number(utilAdj)
              p.set('calc_snapshot', snap)
              const snapData = p.get('snapshot_data') || {}
              if (snapData.calc_snapshot) {
                snapData.calc_snapshot.annual_tariff_adjustment = Number(utilAdj)
              }
              if (snapData.financial) {
                snapData.financial.annual_tariff_adjustment = Number(utilAdj)
              }
              p.set('snapshot_data', snapData)
              app.save(p)
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.log('Erro ao atualizar propostas antigas:', e)
    }
  },
  (app) => {},
)
