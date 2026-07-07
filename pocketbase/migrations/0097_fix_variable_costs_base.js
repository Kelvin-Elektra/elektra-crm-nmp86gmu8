migrate(
  (app) => {
    const costs = app.findRecordsByFilter(
      'pv_costs',
      "calc_method = 'variable' && calc_base = 'fixed'",
      '',
      0,
      0,
    )
    costs.forEach((record) => {
      record.set('calc_base', 'modules')
      app.save(record)
    })
  },
  (app) => {
    // Not reversible — original calc_base values cannot be distinguished
  },
)
