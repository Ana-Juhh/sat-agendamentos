/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" && usuario.id = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && usuario.id = @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.isAdmin = true || usuario = @request.auth.id",
    "viewRule": "@request.auth.isAdmin = true || usuario = @request.auth.id"
  }, collection)

  return app.save(collection)
})
