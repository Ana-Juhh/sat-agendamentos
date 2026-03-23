/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // update collection data
  unmarshal({
    "name": "agendamentos_tmp"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // update collection data
  unmarshal({
    "name": "agendamentos"
  }, collection)

  return app.save(collection)
})
