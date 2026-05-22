migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.listRule = ''
    col.viewRule = ''
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('system_settings')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
  },
)
