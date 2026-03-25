/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
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
        "id": "select1882004807",
        "maxSelect": 1,
        "name": "tipo",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "lab",
          "maker"
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text721557926",
        "max": 0,
        "min": 0,
        "name": "turma",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2408038294",
        "max": 0,
        "min": 0,
        "name": "classe",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2514242599",
        "max": 0,
        "min": 0,
        "name": "observacoes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
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
        "id": "select3988598510",
        "maxSelect": 1,
        "name": "status_entrega",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "pendente",
          "em_uso",
          "devolvido",
          "atrasado"
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
    "id": "pbc_3275997265",
    "indexes": [],
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "name": "agendamentos_espacos",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3275997265");

  return app.delete(collection);
})
