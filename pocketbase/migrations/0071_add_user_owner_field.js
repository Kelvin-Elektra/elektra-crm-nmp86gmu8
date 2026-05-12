migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.add(new BoolField({ name: 'is_owner' }))
    col.addIndex('idx_users_is_owner', false, 'is_owner', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.removeIndex('idx_users_is_owner')
    col.removeField('is_owner')
    app.save(col)
  },
)
