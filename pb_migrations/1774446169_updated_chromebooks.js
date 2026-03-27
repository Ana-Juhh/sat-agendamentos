/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "listRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2039419170")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.isAdmin = true",
    "deleteRule": "@request.auth.isAdmin = true",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.isAdmin = true",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  return app.save(collection)
})
