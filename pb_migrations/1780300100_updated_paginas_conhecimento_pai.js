/// <reference path="../pb_data/types.d.ts" />

// Permite organizar a Wiki em temas com subpaginas (ex.: "Windows" com
// "Menu Iniciar", "Explorador de Arquivos" dentro). "pai" aponta pra outra
// pagina da mesma collection; vazio = pagina principal da categoria.
// Apagar o tema apaga as subpaginas junto (cascadeDelete).
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4819203751")

  collection.fields.add(new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_4819203751",
    "hidden": false,
    "id": "relation4819203760",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "pai",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4819203751")

  collection.fields.removeById("relation4819203760")

  return app.save(collection)
})
