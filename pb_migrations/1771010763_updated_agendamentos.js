/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (usuario = @request.auth.id || @request.auth.isAdmin = true)",
    "deleteRule": "@request.auth.id != \"\" && (usuario = @request.auth.id || @request.auth.isAdmin = true)",
    "listRule": "@request.auth.id != \"\" && (usuario = @request.auth.id || @request.auth.isAdmin = true)",
    "updateRule": "@request.auth.id != \"\" && (usuario = @request.auth.id || @request.auth.isAdmin = true)",
    "viewRule": "@request.auth.id != \"\" && (usuario = @request.auth.id || @request.auth.isAdmin = true)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "createRule": "usuario = @request.auth.id",
    "deleteRule": "usuario.id = @request.auth.id",
    "listRule": "@request.auth.id != \"\" && usuario.id = @request.auth.id",
    "updateRule": "usuario.id = @request.auth.id",
    "viewRule": "usuario.id = @request.auth.id"
  }, collection)

  return app.save(collection)
})
