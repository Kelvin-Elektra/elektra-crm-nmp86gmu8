migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')
    if (!companiesCol.fields.getByName('installation_lead_time')) {
      companiesCol.fields.add(new TextField({ name: 'installation_lead_time' }))
    }
    if (!companiesCol.fields.getByName('accepted_payment_methods')) {
      companiesCol.fields.add(new TextField({ name: 'accepted_payment_methods' }))
    }
    app.save(companiesCol)

    const proposalHistoryCol = new Collection({
      name: 'proposal_history',
      type: 'base',
      listRule: "@request.auth.id != '' && proposal_id.company_id = @request.auth.company_id",
      viewRule: "@request.auth.id != '' && proposal_id.company_id = @request.auth.company_id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.role = 'User_elektra'",
      deleteRule: "@request.auth.role = 'User_elektra'",
      fields: [
        {
          name: 'proposal_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('proposals').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'snapshot_data',
          type: 'json',
          required: true,
        },
        {
          name: 'changed_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(proposalHistoryCol)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('proposal_history')
      app.delete(col)
    } catch (_) {}

    const companiesCol = app.findCollectionByNameOrId('companies')
    if (companiesCol.fields.getByName('installation_lead_time')) {
      companiesCol.fields.removeByName('installation_lead_time')
    }
    if (companiesCol.fields.getByName('accepted_payment_methods')) {
      companiesCol.fields.removeByName('accepted_payment_methods')
    }
    app.save(companiesCol)
  },
)
