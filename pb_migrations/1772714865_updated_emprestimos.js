/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // add field
  collection.fields.addAt(6, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_303831998",
    "hidden": false,
    "id": "relation756214346",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "agendamentos",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // remove field
  collection.fields.removeById("relation756214346")

  return app.save(collection)
})
