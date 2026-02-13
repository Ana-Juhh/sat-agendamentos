/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3698545375",
    "hidden": false,
    "id": "relation3502014937",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "ultima_sessao",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // remove field
  collection.fields.removeById("relation3502014937")

  return app.save(collection)
})
