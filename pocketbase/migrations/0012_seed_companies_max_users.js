migrate(
  (app) => {
    const records = app.findRecordsByFilter('companies', '1=1', '', 1000, 0)
    for (let record of records) {
      if (!record.get('max_users')) {
        record.set('max_users', 5)
        app.save(record)
      }
    }
  },
  (app) => {},
)
