/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // remove field
  collection.fields.removeById("date3719714762")

  // remove field
  collection.fields.removeById("date875013003")

  // add field
  collection.fields.addAt(3, new Field({
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

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "number3719714762",
    "max": null,
    "min": null,
    "name": "inicio",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number875013003",
    "max": null,
    "min": null,
    "name": "fim",
    "onlyInt": false,
    "presentable": false,
    "required": false,
    "system": false,
    "type": "number"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940")

  // add field
  collection.fields.addAt(3, new Field({
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
  collection.fields.addAt(4, new Field({
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

  // remove field
  collection.fields.removeById("text2918445923")

  // remove field
  collection.fields.removeById("number3719714762")

  // remove field
  collection.fields.removeById("number875013003")

  return app.save(collection)
})
