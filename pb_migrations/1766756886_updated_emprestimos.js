/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // add field
  collection.fields.addAt(7, new Field({
    "hidden": false,
    "id": "date3867605688",
    "max": "",
    "min": "",
    "name": "saida_em",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1235491884",
    "maxSelect": 1,
    "name": "status",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "em_uso",
      "devolvido"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date305434918",
    "max": "",
    "min": "",
    "name": "entrada_em",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4112031532")

  // remove field
  collection.fields.removeById("date3867605688")

  // update field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select1235491884",
    "maxSelect": 1,
    "name": "acao",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "retirada",
      "devolucao"
    ]
  }))

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "date305434918",
    "max": "",
    "min": "",
    "name": "dataHora",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
})
