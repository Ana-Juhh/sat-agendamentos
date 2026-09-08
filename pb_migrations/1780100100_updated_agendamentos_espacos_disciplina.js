/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3275997265")

  // add field — a planilha quinzenal da grade fixa exige "Disciplina" e nao
  // havia onde guardar isso; sem esse campo o import perderia essa coluna.
  collection.fields.addAt(8, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3061782245",
    "max": 0,
    "min": 0,
    "name": "disciplina",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3275997265")

  // remove field
  collection.fields.removeById("text3061782245")

  return app.save(collection)
})
