migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('cnpj')) {
      col.fields.add(new TextField({ name: 'cnpj' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.removeByName('cnpj')
    app.save(col)
  },
)
