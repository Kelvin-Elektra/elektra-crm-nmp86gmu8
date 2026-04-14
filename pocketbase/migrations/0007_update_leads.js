migrate(
  (app) => {
    app
      .db()
      .newQuery(`
    DELETE FROM leads WHERE id NOT IN (
      SELECT MIN(id) FROM leads GROUP BY phone
    ) AND phone IS NOT NULL AND phone != ''
  `)
      .execute()

    const col = app.findCollectionByNameOrId('leads')

    const phoneField = col.fields.getByName('phone')
    if (phoneField) {
      phoneField.required = true
    }

    col.addIndex('idx_leads_phone', true, 'phone', "phone != ''")

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('leads')
    const phoneField = col.fields.getByName('phone')
    if (phoneField) {
      phoneField.required = false
    }
    col.removeIndex('idx_leads_phone')
    app.save(col)
  },
)
