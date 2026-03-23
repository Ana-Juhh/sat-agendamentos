/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "name": "agendamentos5"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // update collection data
  unmarshal({
    "name": "agendamentos"
  }, collection)

  return app.save(collection)
})
