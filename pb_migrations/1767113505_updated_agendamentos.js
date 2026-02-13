/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "deleteRule": "usuario.id = @request.auth.id",
    "updateRule": "usuario.id = @request.auth.id",
    "viewRule": "usuario.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "deleteRule": "usuario = @request.auth.id",
    "updateRule": "usuario = @request.auth.id",
    "viewRule": "usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
})
