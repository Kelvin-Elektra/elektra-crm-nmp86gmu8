migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_hsp_data')
    app.truncateCollection(col)
  },
  (app) => {
    // Cannot revert truncate operation easily
  },
)
