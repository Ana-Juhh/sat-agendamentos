/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && \n@request.auth.id = usuario.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id = \"\""
  }, collection)

  return app.save(collection)
})
