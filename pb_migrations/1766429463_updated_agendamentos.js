/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "createRule": "usuario = @request.auth.id",
    "deleteRule": "usuario = @request.auth.id",
    "updateRule": "usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": null,
    "updateRule": null
  }, collection)

  return app.save(collection)
})
