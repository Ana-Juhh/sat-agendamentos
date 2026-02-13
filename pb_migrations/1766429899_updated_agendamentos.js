/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date3719714762",
    "max": "",
    "min": "",
    "name": "inicio",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "date875013003",
    "max": "",
    "min": "",
    "name": "fim",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // remove field
  collection.fields.removeById("date3719714762")

  // remove field
  collection.fields.removeById("date875013003")

  return app.save(collection)
})
