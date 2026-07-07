migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    if (!col.fields.getByName('user_id')) {
      col.fields.add(
        new RelationField({
          name: 'user_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('pv_costs')
    col.fields.removeByName('user_id')
    app.save(col)
  },
)
