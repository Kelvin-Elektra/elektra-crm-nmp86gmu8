migrate(
  (app) => {
    // 1. Campos de perda na coleção 'negotiations':
    // - lost_at: date/datetime da perda
    // - loss_reason: motivo da perda (ex: Preço elevado, Concorrente, Desistência, etc.)
    // - loss_notes: observações em texto livre sobre a perda
    // - stage_changed_at: date de quando mudou de estágio pela última vez (útil para cálculo de tempo médio em cada estágio)
    const negCol = app.findCollectionByNameOrId('negotiations')

    if (!negCol.fields.getByName('lost_at')) {
      negCol.fields.add(
        new DateField({
          name: 'lost_at',
          required: false,
        }),
      )
    }

    if (!negCol.fields.getByName('loss_reason')) {
      negCol.fields.add(
        new TextField({
          name: 'loss_reason',
          required: false,
        }),
      )
    }

    if (!negCol.fields.getByName('loss_notes')) {
      negCol.fields.add(
        new TextField({
          name: 'loss_notes',
          required: false,
        }),
      )
    }

    if (!negCol.fields.getByName('stage_changed_at')) {
      negCol.fields.add(
        new DateField({
          name: 'stage_changed_at',
          required: false,
        }),
      )
    }

    app.save(negCol)

    // 2. Campo is_loss_stage na coleção 'pipeline_stages'
    const stageCol = app.findCollectionByNameOrId('pipeline_stages')
    if (!stageCol.fields.getByName('is_loss_stage')) {
      stageCol.fields.add(
        new BoolField({
          name: 'is_loss_stage',
          required: false,
        }),
      )
      app.save(stageCol)
    }

    // 3. Campo has_financing na coleção 'proposals'
    const propCol = app.findCollectionByNameOrId('proposals')
    if (!propCol.fields.getByName('has_financing')) {
      propCol.fields.add(
        new BoolField({
          name: 'has_financing',
          required: false,
        }),
      )
      app.save(propCol)
    }
  },
  (app) => {
    try {
      const negCol = app.findCollectionByNameOrId('negotiations')
      if (negCol.fields.getByName('lost_at')) negCol.fields.removeByName('lost_at')
      if (negCol.fields.getByName('loss_reason')) negCol.fields.removeByName('loss_reason')
      if (negCol.fields.getByName('loss_notes')) negCol.fields.removeByName('loss_notes')
      if (negCol.fields.getByName('stage_changed_at'))
        negCol.fields.removeByName('stage_changed_at')
      app.save(negCol)
    } catch (_) {}

    try {
      const stageCol = app.findCollectionByNameOrId('pipeline_stages')
      if (stageCol.fields.getByName('is_loss_stage')) stageCol.fields.removeByName('is_loss_stage')
      app.save(stageCol)
    } catch (_) {}

    try {
      const propCol = app.findCollectionByNameOrId('proposals')
      if (propCol.fields.getByName('has_financing')) propCol.fields.removeByName('has_financing')
      app.save(propCol)
    } catch (_) {}
  },
)
