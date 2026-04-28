migrate(
  (app) => {
    const distCol = app.findCollectionByNameOrId('pv_distributors')
    if (!distCol.fields.getByName('connections')) {
      distCol.fields.add(new JSONField({ name: 'connections', required: false }))
      app.save(distCol)
    }

    const ruleCol = app.findCollectionByNameOrId('pv_tariff_rules')
    const nt = ruleCol.fields.getByName('network_type')
    if (nt) nt.required = false
    const vt = ruleCol.fields.getByName('voltage')
    if (vt) vt.required = false
    app.save(ruleCol)
  },
  (app) => {
    const distCol = app.findCollectionByNameOrId('pv_distributors')
    if (distCol.fields.getByName('connections')) {
      distCol.fields.removeByName('connections')
      app.save(distCol)
    }
  },
)
