/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // remove field
  collection.fields.removeById("text2918445923")

  // add field
  collection.fields.addAt(6, new Field({
    "hidden": false,
    "id": "date2918445923",
    "max": "",
    "min": "",
    "name": "data",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // add field
  collection.fields.addAt(2, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text2918445923",
    "max": 0,
    "min": 0,
    "name": "data",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  // remove field
  collection.fields.removeById("date2918445923")

  return app.save(collection)
})
