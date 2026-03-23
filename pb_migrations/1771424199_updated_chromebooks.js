/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // remove field
  collection.fields.removeById("number2805064640")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

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

  return app.save(collection)
})
