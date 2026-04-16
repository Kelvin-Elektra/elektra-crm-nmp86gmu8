migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')

    col.fields.add(new SelectField({ name: 'status_new', values: ['active', 'inactive'] }))
    app.save(col)

    app.db().newQuery('UPDATE companies SET status_new = status').execute()

    const col2 = app.findCollectionByNameOrId('companies')
    col2.fields.removeByName('status')
    col2.fields.removeByName('domain')
    app.save(col2)

    const col3 = app.findCollectionByNameOrId('companies')
    const statusNew = col3.fields.getByName('status_new')
    statusNew.name = 'status'
    statusNew.required = true
    app.save(col3)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.fields.add(new TextField({ name: 'status_old', required: true }))
    col.fields.add(new TextField({ name: 'domain', required: false }))
    app.save(col)

    app.db().newQuery('UPDATE companies SET status_old = status').execute()

    const col2 = app.findCollectionByNameOrId('companies')
    col2.fields.removeByName('status')
    app.save(col2)

    const col3 = app.findCollectionByNameOrId('companies')
    const statusOld = col3.fields.getByName('status_old')
    statusOld.name = 'status'
    statusOld.required = true
    app.save(col3)
  },
)
