/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // remove field
  collection.fields.removeById("number2805064640")

  // remove field
  collection.fields.removeById("number1114912523")

  // add field
  collection.fields.addAt(5, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2039419170",
    "hidden": false,
    "id": "relation2725496524",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "chromebook",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "select2063623452",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "ativo",
      "cancelado"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // add field
  collection.fields.addAt(2, new Field({
    "hidden": false,
    "id": "number2805064640",
    "max": null,
    "min": null,
    "name": "carrinho",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "number1114912523",
    "max": null,
    "min": null,
    "name": "quantidade",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // remove field
  collection.fields.removeById("relation2725496524")

  // remove field
  collection.fields.removeById("select2063623452")

  return app.save(collection)
})
