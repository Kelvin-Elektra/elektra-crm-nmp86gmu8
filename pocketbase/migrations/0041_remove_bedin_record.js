migrate(
  (app) => {
    try {
      const company = app.findFirstRecordByData('companies', 'name', 'BrilhaSol')
      if (company) {
        const dists = app.findRecordsByFilter(
          'pv_distributors',
          `company_id = '${company.id}' && (name = 'Bedin' || name = 'teste distr')`,
          '',
          100,
          0,
        )
        for (const d of dists) {
          app.delete(d)
        }
      }
    } catch (e) {
      // Ignore if company or records are not found
    }
  },
  (app) => {
    // Irreversible
  },
)
