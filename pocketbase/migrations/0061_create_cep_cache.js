migrate(
  (app) => {
    const collection = new Collection({
      name: 'cep_cache',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'cep', type: 'text', required: true },
        {
          name: 'city_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('pv_hsp_data').id,
          maxSelect: 1,
        },
        { name: 'state', type: 'text', required: true },
        { name: 'neighborhood', type: 'text' },
        { name: 'street', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('cep_cache')
    app.delete(collection)
  },
)
