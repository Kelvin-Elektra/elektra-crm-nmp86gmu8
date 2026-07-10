migrate(
  (app) => {
    const tariffCol = app.findCollectionByNameOrId('pv_tariff_rules')
    if (!tariffCol.fields.getByName('icms_rate')) {
      tariffCol.fields.add(new NumberField({ name: 'icms_rate' }))
    }
    app.save(tariffCol)

    const negCol = app.findCollectionByNameOrId('negotiations')
    if (!negCol.fields.getByName('consumer_category')) {
      negCol.fields.add(
        new SelectField({
          name: 'consumer_category',
          values: ['Residencial', 'Industrial', 'Comercial', 'Rural', 'Outros'],
          maxSelect: 1,
        }),
      )
    }
    if (!negCol.fields.getByName('simultaneity_factor')) {
      negCol.fields.add(new NumberField({ name: 'simultaneity_factor' }))
    }
    if (!negCol.fields.getByName('public_lighting_fee')) {
      negCol.fields.add(new NumberField({ name: 'public_lighting_fee' }))
    }
    app.save(negCol)
  },
  (app) => {
    const tariffCol = app.findCollectionByNameOrId('pv_tariff_rules')
    tariffCol.fields.removeByName('icms_rate')
    app.save(tariffCol)

    const negCol = app.findCollectionByNameOrId('negotiations')
    negCol.fields.removeByName('consumer_category')
    negCol.fields.removeByName('simultaneity_factor')
    negCol.fields.removeByName('public_lighting_fee')
    app.save(negCol)
  },
)
