migrate(
  (app) => {
    const companies = app.findRecordsByFilter('companies', '1=1', '', 1000, 0)
    const stagesCol = app.findCollectionByNameOrId('pipeline_stages')

    const oldStageMap = {
      lead: { name: 'Novo Lead', order: 1 },
      contact: { name: 'Contato Inicial', order: 2 },
      visit: { name: 'Visita Técnica', order: 3 },
      proposal: { name: 'Proposta Enviada', order: 4 },
      closed: { name: 'Fechado Ganho', order: 5 },
    }

    for (const company of companies) {
      try {
        app.findFirstRecordByData('pipeline_stages', 'company_id', company.id)
      } catch (_) {
        const createdStages = {}
        for (const [oldId, stageData] of Object.entries(oldStageMap)) {
          const record = new Record(stagesCol)
          record.set('company_id', company.id)
          record.set('name', stageData.name)
          record.set('order', stageData.order)
          app.save(record)
          createdStages[oldId] = record.id
        }

        const negs = app.findRecordsByFilter(
          'negotiations',
          `company_id='${company.id}'`,
          '',
          1000,
          0,
        )
        for (const neg of negs) {
          const oldStage = neg.getString('stage')
          if (createdStages[oldStage]) {
            neg.set('stage', createdStages[oldStage])
            app.saveNoValidate(neg)
          }
        }
      }
    }
  },
  (app) => {
    app.db().newQuery('DELETE FROM pipeline_stages').execute()
  },
)
