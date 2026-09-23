/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text4819203746",
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
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4819203747",
        "max": 120,
        "min": 1,
        "name": "nome",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4819203748",
        "max": 140,
        "min": 1,
        "name": "slug",
        "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text4819203749",
        "max": 500,
        "min": 0,
        "name": "descricao",
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
        "id": "text4819203750",
        "max": 40,
        "min": 0,
        "name": "icone",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number481920375",
        "max": null,
        "min": 0,
        "name": "ordem",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "autodate48192037",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate48192038",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_4819203746",
    "indexes": ["CREATE UNIQUE INDEX idx_categorias_conhecimento_slug ON categorias_conhecimento (slug)"],
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "name": "categorias_conhecimento",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4819203746");

  return app.delete(collection);
})
