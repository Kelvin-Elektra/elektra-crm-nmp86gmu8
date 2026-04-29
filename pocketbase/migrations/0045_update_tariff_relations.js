migrate(
  (app) => {
    const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')
    const utilCol = app.findCollectionByNameOrId('pv_utilities')

    try {
      rulesCol.removeIndex('idx_pv_tariff_rules_unique_class')
    } catch (_) {}
    try {
      rulesCol.removeIndex('idx_pv_tariff_rules_distributor')
    } catch (_) {}

    const oldField = rulesCol.fields.getByName('distributor_id')
    if (oldField) {
      rulesCol.fields.removeByName('distributor_id')
    }

    rulesCol.fields.add(
      new RelationField({
        name: 'utility_id',
        collectionId: utilCol.id,
        required: false,
        maxSelect: 1,
      }),
    )

    rulesCol.addIndex('idx_pv_tariff_rules_utility', false, 'utility_id', '')
    rulesCol.addIndex('idx_pv_tariff_rules_unique_class_util', true, 'utility_id, class', '')

    app.save(rulesCol)
  },
  (app) => {
    const rulesCol = app.findCollectionByNameOrId('pv_tariff_rules')
    const distCol = app.findCollectionByNameOrId('pv_distributors')

    try {
      rulesCol.removeIndex('idx_pv_tariff_rules_unique_class_util')
    } catch (_) {}
    try {
      rulesCol.removeIndex('idx_pv_tariff_rules_utility')
    } catch (_) {}

    const newField = rulesCol.fields.getByName('utility_id')
    if (newField) {
      rulesCol.fields.removeByName('utility_id')
    }

    rulesCol.fields.add(
      new RelationField({
        name: 'distributor_id',
        collectionId: distCol.id,
        required: false,
        maxSelect: 1,
      }),
    )

    rulesCol.addIndex('idx_pv_tariff_rules_distributor', false, 'distributor_id', '')
    rulesCol.addIndex('idx_pv_tariff_rules_unique_class', true, 'distributor_id, class', '')

    app.save(rulesCol)
  },
)
