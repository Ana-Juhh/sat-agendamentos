/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.isAdmin = true",
    "deleteRule": "@request.auth.isAdmin = true",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.isAdmin = true",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "usuario = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "updateRule": "usuario = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
})
