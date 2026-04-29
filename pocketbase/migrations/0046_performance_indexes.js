migrate(
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    leadsCol.addIndex('idx_leads_perf_owner', false, 'owner_id', '')
    leadsCol.addIndex('idx_leads_perf_company', false, 'company_id', '')
    leadsCol.addIndex('idx_leads_perf_created', false, 'created DESC', '')
    app.save(leadsCol)

    const negCol = app.findCollectionByNameOrId('negotiations')
    negCol.addIndex('idx_neg_perf_owner', false, 'owner_id', '')
    negCol.addIndex('idx_neg_perf_company', false, 'company_id', '')
    negCol.addIndex('idx_neg_perf_stage', false, 'stage', '')
    negCol.addIndex('idx_neg_perf_created', false, 'created DESC', '')
    app.save(negCol)
  },
  (app) => {
    const leadsCol = app.findCollectionByNameOrId('leads')
    leadsCol.removeIndex('idx_leads_perf_owner')
    leadsCol.removeIndex('idx_leads_perf_company')
    leadsCol.removeIndex('idx_leads_perf_created')
    app.save(leadsCol)

    const negCol = app.findCollectionByNameOrId('negotiations')
    negCol.removeIndex('idx_neg_perf_owner')
    negCol.removeIndex('idx_neg_perf_company')
    negCol.removeIndex('idx_neg_perf_stage')
    negCol.removeIndex('idx_neg_perf_created')
    app.save(negCol)
  },
)
