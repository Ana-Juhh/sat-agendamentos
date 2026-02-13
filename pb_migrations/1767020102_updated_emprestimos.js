/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id != \"\"",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  // remove field
  collection.fields.removeById("select1235491884")

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2063623452",
    "max": 0,
    "min": 0,
    "name": "status",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.id = usuario.id",
    "listRule": "@request.auth.id != \"\" &&\n(\n  @request.auth.isAdmin = true ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && \n(\n  @request.auth.id = usuario.id ||\n  @request.auth.id = agendamento.usuario.id\n)",
    "viewRule": "@request.auth.id != \"\" &&\n(\n  @request.auth.isAdmin = true ||\n  usuario = @request.auth.id\n)"
  }, collection)

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1235491884",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "em_uso",
      "devolvido"
    ]
  }))

  // remove field
  collection.fields.removeById("text2063623452")

  return app.save(collection)
})
