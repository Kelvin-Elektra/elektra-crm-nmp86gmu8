migrate(
  (app) => {
    // 1. Degradação anual nos módulos (pv_modules)
    const modulesCol = app.findCollectionByNameOrId('pv_modules')
    if (!modulesCol.fields.getByName('annual_degradation')) {
      modulesCol.fields.add(
        new NumberField({
          name: 'annual_degradation',
          required: false,
          min: 0,
          max: 10,
        }),
      )
      app.save(modulesCol)
    }

    // 2. Fio B na concessionária (pv_utilities)
    const utilCol = app.findCollectionByNameOrId('pv_utilities')
    if (!utilCol.fields.getByName('fio_b_value')) {
      utilCol.fields.add(
        new NumberField({
          name: 'fio_b_value',
          required: false,
          min: 0,
        }),
      )
      app.save(utilCol)
    }

    // 3. Reajuste anual da tarifa de energia editável na negociação (negotiations)
    const negCol = app.findCollectionByNameOrId('negotiations')
    if (!negCol.fields.getByName('annual_tariff_adjustment')) {
      negCol.fields.add(
        new NumberField({
          name: 'annual_tariff_adjustment',
          required: false,
          min: 0,
        }),
      )
      app.save(negCol)
    }

    // 4. Campo opcional de reajuste anual padrão nas configurações de proposta da empresa (proposal_settings)
    const settingsCol = app.findCollectionByNameOrId('proposal_settings')
    if (!settingsCol.fields.getByName('default_tariff_adjustment')) {
      settingsCol.fields.add(
        new NumberField({
          name: 'default_tariff_adjustment',
          required: false,
          min: 0,
        }),
      )
      app.save(settingsCol)
    }
  },
  (app) => {
    try {
      const modulesCol = app.findCollectionByNameOrId('pv_modules')
      if (modulesCol.fields.getByName('annual_degradation')) {
        modulesCol.fields.removeByName('annual_degradation')
        app.save(modulesCol)
      }
    } catch (_) {}

    try {
      const utilCol = app.findCollectionByNameOrId('pv_utilities')
      if (utilCol.fields.getByName('fio_b_value')) {
        utilCol.fields.removeByName('fio_b_value')
        app.save(utilCol)
      }
    } catch (_) {}

    try {
      const negCol = app.findCollectionByNameOrId('negotiations')
      if (negCol.fields.getByName('annual_tariff_adjustment')) {
        negCol.fields.removeByName('annual_tariff_adjustment')
        app.save(negCol)
      }
    } catch (_) {}

    try {
      const settingsCol = app.findCollectionByNameOrId('proposal_settings')
      if (settingsCol.fields.getByName('default_tariff_adjustment')) {
        settingsCol.fields.removeByName('default_tariff_adjustment')
        app.save(settingsCol)
      }
    } catch (_) {}
  },
)
