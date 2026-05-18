/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2875637098")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "deleteRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "updateRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2875637098")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
