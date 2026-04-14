migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin_elektra', 'admin_company', 'user'],
          maxSelect: 1,
        }),
      )
    }
    if (!users.fields.getByName('status')) {
      users.fields.add(
        new SelectField({ name: 'status', values: ['active', 'inactive'], maxSelect: 1 }),
      )
    }
    if (!users.fields.getByName('company_id')) {
      users.fields.add(
        new RelationField({
          name: 'company_id',
          collectionId: app.findCollectionByNameOrId('companies').id,
          maxSelect: 1,
        }),
      )
    }

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.removeByName('role')
    users.fields.removeByName('status')
    users.fields.removeByName('company_id')
    app.save(users)
  },
)
