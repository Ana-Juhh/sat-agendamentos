/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" &&\n(\n  @request.auth.isAdmin = true ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" &&\n(\n  @request.auth.isAdmin = true ||\n  usuario = @request.auth.id\n)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.isAdmin = true ||\n(\n  @request.auth.id != \"\" &&\n  (\n    usuario.id = @request.auth.id ||\n    agendamento.usuario.id = @request.auth.id\n  )\n)",
    "viewRule": "@request.auth.isAdmin = true ||\n(\n  @request.auth.id != \"\" &&\n  (\n    usuario.id = @request.auth.id ||\n    agendamento.usuario.id = @request.auth.id\n  )\n)"
  }, collection)

  return app.save(collection)
})
