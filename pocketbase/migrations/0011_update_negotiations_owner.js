migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.add(
      new RelationField({
        name: 'owner_id',
        collectionId: '_pb_users_auth_',
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.removeByName('owner_id')
    app.save(col)
  },
)
