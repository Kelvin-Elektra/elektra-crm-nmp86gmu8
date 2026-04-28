migrate(
  (app) => {
    try {
      const company = app.findFirstRecordByData('companies', 'name', 'BrilhaSol')
      if (company) {
        app
          .db()
          .newQuery(
            `DELETE FROM pv_distributors WHERE company_id = {:companyId} AND (name = 'bedin' OR name = 'teste distr')`,
          )
          .bind({ companyId: company.id })
          .execute()
      }
    } catch (_) {
      // Company BrilhaSol not found, safe to ignore
    }
  },
  (app) => {
    // Data deletion is irreversible
  },
)
