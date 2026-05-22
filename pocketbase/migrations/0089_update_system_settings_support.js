migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    if (!col.fields.getByName('support_info')) {
      col.fields.add(new TextField({ name: 'support_info' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    if (col.fields.getByName('support_info')) {
      col.fields.removeByName('support_info')
      app.save(col)
    }
  },
)
