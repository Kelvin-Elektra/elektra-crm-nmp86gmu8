migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    DELETE FROM leads WHERE id NOT IN (
      SELECT MIN(id) FROM leads GROUP BY phone, company_id
    ) AND phone != '' AND phone IS NOT NULL
  `)
      .execute()

    const col = app.findCollectionByNameOrId('leads')
    col.addIndex('idx_leads_phone_company', true, 'phone, company_id', "phone != ''")
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    col.removeIndex('idx_leads_phone_company')
    app.save(col)
  },
)
