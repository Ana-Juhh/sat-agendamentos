/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.id != \"\" && \n(\n  @request.auth.id = usuario.id ||\n  @request.auth.id = agendamento.usuario.id\n)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "updateRule": "@request.auth.id = \"\""
  }, collection)

  return app.save(collection)
})
