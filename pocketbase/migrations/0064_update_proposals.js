migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.add(new JSONField({ name: 'cost_breakdown' }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')
    col.fields.removeByName('cost_breakdown')
    app.save(col)
  },
)
