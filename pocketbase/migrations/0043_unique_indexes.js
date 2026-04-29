migrate(
  (app) => {
    // 1. Remove duplicates for pv_distributors (keep the oldest)
    app
      .db()
      .newQuery(`
    DELETE FROM pv_distributors WHERE id NOT IN (
      SELECT MIN(id) FROM pv_distributors GROUP BY company_id, name
    ) AND name IS NOT NULL
  `)
      .execute()

    const distCol = app.findCollectionByNameOrId('pv_distributors')
    distCol.addIndex('idx_pv_distributors_unique_name', true, 'company_id, name', '')
    app.save(distCol)

    // 2. Remove duplicates for pv_tariff_rules
    app
      .db()
      .newQuery(`
    DELETE FROM pv_tariff_rules WHERE id NOT IN (
      SELECT MIN(id) FROM pv_tariff_rules GROUP BY distributor_id, class
    ) AND class IS NOT NULL
  `)
      .execute()

    const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')
    rulesCol.addIndex('idx_pv_tariff_rules_unique_class', true, 'distributor_id, class', '')
    app.save(rulesCol)
  },
  (app) => {
    const distCol = app.findCollectionByNameOrId('pv_distributors')
    distCol.removeIndex('idx_pv_distributors_unique_name')
    app.save(distCol)

    const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')
    rulesCol.removeIndex('idx_pv_tariff_rules_unique_class')
    app.save(rulesCol)
  },
)
