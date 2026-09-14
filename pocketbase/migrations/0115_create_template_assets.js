migrate(
  (app) => {
    const collection = new Collection({
      name: 'template_assets',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (company_id = @request.auth.company_id || @request.auth.role = 'User_elektra')",
      viewRule: '',
      createRule:
        "@request.auth.id != '' && (company_id = @request.auth.company_id || @request.auth.role = 'User_elektra')",
      updateRule:
        "@request.auth.id != '' && (company_id = @request.auth.company_id || @request.auth.role = 'User_elektra')",
      deleteRule:
        "@request.auth.id != '' && (company_id = @request.auth.company_id || @request.auth.role = 'User_elektra')",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('companies').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'file',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'],
        },
        {
          name: 'field_key',
          type: 'text',
        },
        {
          name: 'template_id',
          type: 'text',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('template_assets')
      app.delete(col)
    } catch (_) {}
  },
)
