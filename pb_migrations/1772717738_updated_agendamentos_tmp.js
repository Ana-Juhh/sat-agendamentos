/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "updateRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
})
