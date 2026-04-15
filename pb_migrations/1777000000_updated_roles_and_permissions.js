/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_")
  users.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "superadmin",
      "admin",
      "professor",
      "estagiario_manha",
      "estagiario_tarde"
    ]
  }))
  app.save(users)

  const agendamentos = app.findCollectionByNameOrId("pbc_303831998")
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)"
  }, agendamentos)
  app.save(agendamentos)

  const agendamentosEspacos = app.findCollectionByNameOrId("pbc_3275997265")
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\" ||\n  usuario = @request.auth.id\n)"
  }, agendamentosEspacos)
  app.save(agendamentosEspacos)

  const chromebooks = app.findCollectionByNameOrId("pbc_2039419170")
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)",
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)",
    "listRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)",
    "viewRule": "@request.auth.id != \"\""
  }, chromebooks)
  app.save(chromebooks)

  const relatorios = app.findCollectionByNameOrId("pbc_733803058")
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)",
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"superadmin\""
  }, relatorios)
  app.save(relatorios)

  const relatorioItens = app.findCollectionByNameOrId("pbc_3411329596")
  unmarshal({
    "createRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  @request.auth.role = \"superadmin\"\n)",
    "deleteRule": "@request.auth.role = \"superadmin\"",
    "listRule": "@request.auth.role = \"superadmin\"",
    "updateRule": "@request.auth.role = \"superadmin\"",
    "viewRule": "@request.auth.role = \"superadmin\""
  }, relatorioItens)
  app.save(relatorioItens)
}, (app) => {
  const users = app.findCollectionByNameOrId("_pb_users_auth_")
  users.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select1466534506",
    "maxSelect": 1,
    "name": "role",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "admin",
      "professor",
      "estagiario_manha",
      "estagiario_tarde"
    ]
  }))
  app.save(users)

  const agendamentos = app.findCollectionByNameOrId("pbc_303831998")
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)"
  }, agendamentos)
  app.save(agendamentos)

  const agendamentosEspacos = app.findCollectionByNameOrId("pbc_3275997265")
  unmarshal({
    "deleteRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "listRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "updateRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)",
    "viewRule": "@request.auth.id != \"\" && (\n  @request.auth.role = \"admin\" ||\n  usuario = @request.auth.id\n)"
  }, agendamentosEspacos)
  app.save(agendamentosEspacos)

  const chromebooks = app.findCollectionByNameOrId("pbc_2039419170")
  unmarshal({
    "createRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "listRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\"",
    "viewRule": "@request.auth.id != \"\" && @request.auth.role = \"admin\""
  }, chromebooks)
  app.save(chromebooks)

  const relatorios = app.findCollectionByNameOrId("pbc_733803058")
  unmarshal({
    "createRule": null,
    "deleteRule": "@request.auth.role = \"admin\"",
    "listRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"admin\""
  }, relatorios)
  app.save(relatorios)

  const relatorioItens = app.findCollectionByNameOrId("pbc_3411329596")
  unmarshal({
    "createRule": null,
    "deleteRule": "@request.auth.role = \"admin\"",
    "listRule": "@request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "viewRule": "@request.auth.role = \"admin\""
  }, relatorioItens)
  app.save(relatorioItens)
})
