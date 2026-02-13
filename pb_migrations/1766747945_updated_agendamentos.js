/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // remove field
  collection.fields.removeById("number1114912523")

  return app.save(collection)
})
