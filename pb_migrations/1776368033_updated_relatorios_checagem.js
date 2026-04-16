/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_733803058")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"superadmin\" ||\n@request.auth.role = \"admin\" ||\n@request.auth.role = \"estagiario_manha\" ||\n@request.auth.role = \"estagiario_tarde\"",
    "viewRule": "@request.auth.role = \"superadmin\" ||\n@request.auth.role = \"admin\" ||\n@request.auth.role = \"estagiario_manha\" ||\n@request.auth.role = \"estagiario_tarde\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_733803058")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"superadmin\""
  }, collection)

  return app.save(collection)
})
