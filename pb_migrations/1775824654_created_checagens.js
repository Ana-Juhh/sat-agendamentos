/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": null,
    "deleteRule": null,
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_2039419170",
        "hidden": false,
        "id": "relation2306749014",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "chromebooks",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "select3885459298",
        "maxSelect": 1,
        "name": "turno",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "manha",
          "tarde"
        ]
      },
      {
        "hidden": false,
        "id": "bool149361778",
        "name": "verificado",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text305795341",
        "max": 0,
        "min": 0,
        "name": "observacao",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "file3940301797",
        "maxSelect": 1,
        "maxSize": 0,
        "mimeTypes": [],
        "name": "foto",
        "presentable": false,
        "protected": false,
        "required": false,
        "system": false,
        "thumbs": [],
        "type": "file"
      },
      {
        "hidden": false,
        "id": "date4161237940",
        "max": "",
        "min": "",
        "name": "verificadoEm",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation2284227682",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "verificadoPor",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "date1300033827",
        "max": "",
        "min": "",
        "name": "dataReferencia",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select2201516003",
        "maxSelect": 1,
        "name": "statusEncontrado",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "ok",
          "tela_quebrada",
          "nao_liga",
          "outro"
        ]
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3454080204",
    "indexes": [],
    "listRule": null,
    "name": "checagens",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3454080204");

  return app.delete(collection);
})
