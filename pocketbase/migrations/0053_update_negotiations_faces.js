migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    if (!col.fields.getByName('use_roof_faces')) {
      col.fields.add(new BoolField({ name: 'use_roof_faces' }))
    }
    if (!col.fields.getByName('roof_faces_data')) {
      col.fields.add(new JSONField({ name: 'roof_faces_data' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.removeByName('use_roof_faces')
    col.fields.removeByName('roof_faces_data')
    app.save(col)
  },
)
