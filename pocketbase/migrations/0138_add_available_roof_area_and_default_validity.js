migrate(
  (app) => {
    const negCol = app.findCollectionByNameOrId('negotiations')
    if (!negCol.fields.getByName('available_roof_area')) {
      negCol.fields.add(
        new NumberField({
          name: 'available_roof_area',
          min: 0,
        }),
      )
      app.save(negCol)
    }

    const psCol = app.findCollectionByNameOrId('proposal_settings')
    if (!psCol.fields.getByName('default_validity_days')) {
      psCol.fields.add(
        new NumberField({
          name: 'default_validity_days',
          min: 1,
        }),
      )
      app.save(psCol)
    }
  },
  (app) => {
    try {
      const negCol = app.findCollectionByNameOrId('negotiations')
      negCol.fields.removeByName('available_roof_area')
      app.save(negCol)
    } catch (_) {}

    try {
      const psCol = app.findCollectionByNameOrId('proposal_settings')
      psCol.fields.removeByName('default_validity_days')
      app.save(psCol)
    } catch (_) {}
  },
)
