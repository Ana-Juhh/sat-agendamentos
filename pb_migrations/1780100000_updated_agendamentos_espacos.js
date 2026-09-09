/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3275997265")

  // update field — soma "carrinhos" (ja usado em producao, sem migration
  // correspondente no historico) e "GRADE_FIXA" (bloqueios importados da
  // planilha quinzenal da coordenacao) aos valores existentes.
  collection.fields.addAt(2, new Field({
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
      "maker",
      "carrinhos",
      "GRADE_FIXA"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3275997265")

  // update field
  collection.fields.addAt(2, new Field({
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
  }))

  return app.save(collection)
})
