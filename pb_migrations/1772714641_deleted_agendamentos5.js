/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2055908940");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
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
        "collectionId": "_pb_users_auth_",
        "hidden": false,
        "id": "relation577089629",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "usuario",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
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
      },
      {
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
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "ativo",
          "cancelado"
        ]
      },
      {
        "hidden": false,
        "id": "date2918445923",
        "max": "",
        "min": "",
        "name": "data",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
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
    "id": "pbc_2055908940",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "name": "agendamentos5",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && usuario = @request.auth.id",
    "viewRule": "@request.auth.id != \"\" && usuario = @request.auth.id"
  });

  return app.save(collection);
})
