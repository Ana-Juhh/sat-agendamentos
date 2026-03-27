/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // add field
  collection.fields.addAt(11, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_2039419170",
    "hidden": false,
    "id": "relation4208839157",
    "maxSelect": 999,
    "minSelect": 0,
    "name": "chromebooks_devolvidos",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_303831998")

  // remove field
  collection.fields.removeById("relation4208839157")

  return app.save(collection)
})
