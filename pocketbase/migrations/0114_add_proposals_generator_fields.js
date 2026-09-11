migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')

    if (!col.fields.getByName('external_id')) {
      col.fields.add(
        new TextField({
          name: 'external_id',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('view_url')) {
      col.fields.add(
        new URLField({
          name: 'view_url',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposals')

    if (col.fields.getByName('external_id')) {
      col.fields.removeByName('external_id')
    }
    if (col.fields.getByName('view_url')) {
      col.fields.removeByName('view_url')
    }

    app.save(col)
  },
)
