migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    if (!col.fields.getByName('visible_pages')) {
      col.fields.add(new JSONField({ name: 'visible_pages', maxSize: 10000 }))
    }
    if (!col.fields.getByName('branding')) {
      col.fields.add(new JSONField({ name: 'branding', maxSize: 10000 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('proposal_settings')
    col.fields.removeByName('visible_pages')
    col.fields.removeByName('branding')
    app.save(col)
  },
)
