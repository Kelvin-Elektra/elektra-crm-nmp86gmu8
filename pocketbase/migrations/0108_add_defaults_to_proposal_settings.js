migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')

    if (!col.fields.getByName('default_lead_time_days')) {
      col.fields.add(new NumberField({ name: 'default_lead_time_days' }))
    }
    if (!col.fields.getByName('default_lead_time_text')) {
      col.fields.add(new TextField({ name: 'default_lead_time_text' }))
    }
    if (!col.fields.getByName('default_payment_methods')) {
      col.fields.add(new JSONField({ name: 'default_payment_methods' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.removeByName('default_lead_time_days')
    col.fields.removeByName('default_lead_time_text')
    col.fields.removeByName('default_payment_methods')
    app.save(col)
  },
)
