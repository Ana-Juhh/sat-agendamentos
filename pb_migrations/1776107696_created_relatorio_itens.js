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
        "collectionId": "pbc_733803058",
        "hidden": false,
        "id": "relation2126060047",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "relatorio",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_2039419170",
        "hidden": false,
        "id": "relation2725496524",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "chromebook",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
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
          "teclado_com_defeito",
          "carregamento_com_defeito",
          "outro"
        ]
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
    "id": "pbc_3411329596",
    "indexes": [],
    "listRule": null,
    "name": "relatorio_itens",
    "system": false,
    "type": "base",
    "updateRule": null,
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3411329596");

  return app.delete(collection);
})
