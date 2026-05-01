migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.add(new JSONField({ name: 'pages_layout' }))
    col.fields.add(new TextField({ name: 'active_template_id' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.removeByName('pages_layout')
    col.fields.removeByName('active_template_id')
    app.save(col)
  },
)
