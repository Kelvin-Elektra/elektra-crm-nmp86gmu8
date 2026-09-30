migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('signature_requests')
    if (!col.fields.getByName('original_pdf')) {
      col.fields.add(
        new FileField({
          name: 'original_pdf',
          maxSelect: 1,
          maxSize: 31457280, // 30MB
          mimeTypes: ['application/pdf'],
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('signature_requests')
      if (col.fields.getByName('original_pdf')) {
        col.fields.removeByName('original_pdf')
        app.save(col)
      }
    } catch (_) {}
  },
)
