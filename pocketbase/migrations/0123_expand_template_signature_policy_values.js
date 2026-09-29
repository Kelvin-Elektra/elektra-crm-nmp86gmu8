migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('contract_templates')

    const field = templatesCol.fields.getByName('signature_policy')
    const allValues = [
      'client_only',
      'client_rep',
      'client_owner',
      'client_rep_owner',
      'rep_only',
      'owner_only',
      'rep_owner',
    ]

    if (field) {
      field.values = allValues
      field.maxSelect = 1
      field.required = false
    } else {
      templatesCol.fields.add(
        new SelectField({
          name: 'signature_policy',
          values: allValues,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(templatesCol)
  },
  (app) => {
    try {
      const templatesCol = app.findCollectionByNameOrId('contract_templates')
      const field = templatesCol.fields.getByName('signature_policy')
      if (field) {
        field.values = ['client_only', 'client_rep', 'client_owner', 'client_rep_owner']
        app.save(templatesCol)
      }
    } catch (_) {}
  },
)
