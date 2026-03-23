/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text721557926",
    "max": 0,
    "min": 0,
    "name": "turma",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2408038294",
    "max": 0,
    "min": 0,
    "name": "classe",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2514242599",
    "max": 0,
    "min": 0,
    "name": "observacoes",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "select3988598510",
    "maxSelect": 1,
    "name": "status_entrega",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "pendente",
      "em_uso",
      "devolvido",
      "atrasado"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // remove field
  collection.fields.removeById("text721557926")

  // remove field
  collection.fields.removeById("text2408038294")

  // remove field
  collection.fields.removeById("text2514242599")

  // remove field
  collection.fields.removeById("select3988598510")

  return app.save(collection)
})
