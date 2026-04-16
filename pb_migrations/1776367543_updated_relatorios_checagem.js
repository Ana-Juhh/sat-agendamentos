/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_733803058")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = \"superadmin\" || @request.auth.role = \"admin\" || @request.auth.role = \"estagiario_manha\" || @request.auth.role = \"estagiario_tarde\""
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_733803058")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)"
  }, collection)

  return app.save(collection)
})
