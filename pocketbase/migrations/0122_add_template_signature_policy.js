migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('contract_templates')

    // Adicionar campo signature_policy em contract_templates (opcional, vazio = herdar da empresa)
    if (!templatesCol.fields.getByName('signature_policy')) {
      templatesCol.fields.add(
        new SelectField({
          name: 'signature_policy',
          values: ['client_only', 'client_rep', 'client_owner', 'client_rep_owner'],
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(templatesCol)
    }
  },
  (app) => {
    try {
      const templatesCol = app.findCollectionByNameOrId('contract_templates')
      if (templatesCol.fields.getByName('signature_policy')) {
        templatesCol.fields.removeByName('signature_policy')
        app.save(templatesCol)
      }
    } catch (_) {}
  },
)
