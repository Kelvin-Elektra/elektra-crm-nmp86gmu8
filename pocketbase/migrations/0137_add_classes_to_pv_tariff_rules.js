migrate(
  (app) => {
    const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')

    // 1. Remover índice UNIQUE em (utility_id, class)
    try {
      rulesCol.removeIndex('idx_pv_tariff_rules_unique_class_util')
    } catch (_) {}

    // 2. Adicionar campo classes (JSON) se não existir
    if (!rulesCol.fields.getByName('classes')) {
      rulesCol.fields.add(
        new JSONField({
          name: 'classes',
          required: false,
        }),
      )
    }

    app.save(rulesCol)

    // 3. Backfill das tarifas existentes: preencher classes = [class] se classes estiver vazio
    try {
      const records = app.findRecordsByFilter(
        'pv_tariff_rules',
        "classes = null || classes = '' || classes = '[]'",
        '',
        0,
        0,
      )
      for (const rec of records) {
        const cls = rec.get('class')
        if (cls) {
          rec.set('classes', [cls])
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')
      if (rulesCol.fields.getByName('classes')) {
        rulesCol.fields.removeByName('classes')
      }
      rulesCol.addIndex('idx_pv_tariff_rules_unique_class_util', true, 'utility_id, class', '')
      app.save(rulesCol)
    } catch (_) {}
  },
)
