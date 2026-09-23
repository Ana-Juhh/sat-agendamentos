/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = \"superadmin\"",
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "fields": [
      { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": "text4819203751", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" },
      { "cascadeDelete": true, "collectionId": "pbc_4819203746", "hidden": false, "id": "relation4819203", "maxSelect": 1, "minSelect": 1, "name": "categoria", "presentable": false, "required": true, "system": false, "type": "relation" },
      { "autogeneratePattern": "", "hidden": false, "id": "text4819203752", "max": 180, "min": 1, "name": "titulo", "pattern": "", "presentable": true, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text4819203753", "max": 200, "min": 1, "name": "slug", "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text4819203754", "max": 500, "min": 0, "name": "resumo", "pattern": "", "presentable": false, "primaryKey": false, "required": false, "system": false, "type": "text" },
      { "autogeneratePattern": "", "hidden": false, "id": "text4819203755", "max": 0, "min": 0, "name": "conteudo", "pattern": "", "presentable": false, "primaryKey": false, "required": true, "system": false, "type": "text" },
      { "hidden": false, "id": "number481920376", "max": null, "min": 0, "name": "ordem", "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" },
      { "hidden": false, "id": "autodate48192039", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": "autodate48192040", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" }
    ],
    "id": "pbc_4819203751",
    "indexes": ["CREATE UNIQUE INDEX idx_paginas_conhecimento_categoria_slug ON paginas_conhecimento (categoria, slug)"],
    "listRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\"",
    "name": "paginas_conhecimento",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4819203751");

  return app.delete(collection);
})
