migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    if (!col.fields.getByName('arquivos')) {
      col.fields.add(
        new FileField({
          name: 'arquivos',
          maxSelect: 10,
          maxSize: 52428800,
          mimeTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
        }),
      )
    }
    if (!col.fields.getByName('sizing')) {
      col.fields.add(
        new JSONField({
          name: 'sizing',
          maxSize: 2000000,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('negotiations')
    col.fields.removeByName('arquivos')
    col.fields.removeByName('sizing')
    app.save(col)
  },
)
