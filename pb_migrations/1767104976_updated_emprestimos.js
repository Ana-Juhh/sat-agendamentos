/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "createRule": "usuario.id = @request.auth.id",
    "deleteRule": "usuario.id = @request.auth.id",
    "listRule": "usuario.id = @request.auth.id",
    "updateRule": "usuario.id = @request.auth.id",
    "viewRule": "usuario.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "createRule": "usuario = @request.auth.id",
    "deleteRule": null,
    "listRule": "usuario = @request.auth.id",
    "updateRule": "usuario = @request.auth.id",
    "viewRule": "usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
})
