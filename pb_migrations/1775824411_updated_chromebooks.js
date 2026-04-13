/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "select1882004807",
    "maxSelect": 1,
    "name": "tipo",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "agendamento",
      "carrinho"
    ]
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2805064640",
    "max": 0,
    "min": 0,
    "name": "carrinho",
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
    "id": "text2608907034",
    "max": 0,
    "min": 0,
    "name": "posicao",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // remove field
  collection.fields.removeById("select1882004807")

  // remove field
  collection.fields.removeById("text2805064640")

  // remove field
  collection.fields.removeById("text2608907034")

  return app.save(collection)
})
