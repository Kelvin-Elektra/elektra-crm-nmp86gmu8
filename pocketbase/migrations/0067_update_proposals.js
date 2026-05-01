migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    if (!col.fields.getByName('snapshot_data')) {
      col.fields.add(new JSONField({ name: 'snapshot_data' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.removeByName('snapshot_data')
    app.save(col)
  },
)
