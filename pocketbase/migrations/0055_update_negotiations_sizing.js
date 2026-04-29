migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('negotiations')
    // The sizing field already exists as JSON, which accommodates the new manual loss fields without structural changes.
    // We save the collection to ensure schema integrity and acknowledge the JSON payload update conceptually.
    app.save(collection)
  },
  (app) => {},
)
