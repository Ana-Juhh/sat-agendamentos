/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.isAdmin = true",
    "listRule": "@request.auth.isAdmin = true || usuario = @request.auth.id",
    "updateRule": "@request.auth.isAdmin = true",
    "viewRule": "@request.auth.isAdmin = true || usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "deleteRule": "usuario = @request.auth.id",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "usuario = @request.auth.id",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
