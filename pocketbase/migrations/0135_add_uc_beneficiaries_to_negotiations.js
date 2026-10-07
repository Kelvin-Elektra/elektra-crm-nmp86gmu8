migrate(
  (app) => {
    const negCol = app.findCollectionByNameOrId('negotiations')

    if (!negCol.fields.getByName('uc_beneficiaries')) {
      negCol.fields.add(
        new JSONField({
          name: 'uc_beneficiaries',
          required: false,
        }),
      )
      app.save(negCol)
    }
  },
  (app) => {
    try {
      const negCol = app.findCollectionByNameOrId('negotiations')
      if (negCol.fields.getByName('uc_beneficiaries')) {
        negCol.fields.removeByName('uc_beneficiaries')
        app.save(negCol)
      }
    } catch (_) {}
  },
)
