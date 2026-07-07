migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')

    const kitDetailsField = col.fields.getByName('kit_details')
    if (kitDetailsField) {
      kitDetailsField.max = 1000000
    }

    const snapshotField = col.fields.getByName('snapshot_data')
    if (snapshotField) {
      snapshotField.maxSize = 10485760
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')

    const kitDetailsField = col.fields.getByName('kit_details')
    if (kitDetailsField) {
      kitDetailsField.max = 5000
    }

    const snapshotField = col.fields.getByName('snapshot_data')
    if (snapshotField) {
      snapshotField.maxSize = 0
    }

    app.save(col)
  },
)
