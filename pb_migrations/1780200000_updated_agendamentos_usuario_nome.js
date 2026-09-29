/// <reference path="../pb_data/types.d.ts" />

// Guarda o nome de quem agendou dentro do proprio agendamento. A collection
// "users" so pode ser lida pelo superadmin, entao para admin/professor/
// estagiario o expand de "usuario" volta vazio e o nome nao aparecia nas
// telas. Com esse campo (preenchido pelo hook em pb_hooks/agendamentos.pb.js)
// o nome aparece sem precisar liberar a leitura de usuarios.

migrate((app) => {
  const COLLECTIONS = [
    { id: "pbc_303831998", fieldId: "text1780200001" }, // agendamentos_tmp
    { id: "pbc_3275997265", fieldId: "text1780200002" }, // agendamentos_espacos
  ]

  const nomesPorUsuario = {}

  function nomeDoUsuario(usuarioId) {
    if (!usuarioId) return ""
    if (usuarioId in nomesPorUsuario) return nomesPorUsuario[usuarioId]

    let nome = ""
    try {
      const usuario = app.findRecordById("users", usuarioId)
      nome =
        usuario.getString("name").trim() ||
        usuario.getString("nome").trim() ||
        usuario.getString("email").trim()
    } catch (_) {
      nome = ""
    }

    nomesPorUsuario[usuarioId] = nome
    return nome
  }

  for (const { id, fieldId } of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(id)

    collection.fields.add(new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": fieldId,
      "max": 0,
      "min": 0,
      "name": "usuario_nome",
      "pattern": "",
      "presentable": false,
      "primaryKey": false,
      "required": false,
      "system": false,
      "type": "text"
    }))

    app.save(collection)

    // Preenche os agendamentos que ja existem.
    const registros = app.findAllRecords(collection.name)
    for (const registro of registros) {
      const nome = nomeDoUsuario(registro.getString("usuario"))
      if (!nome) continue

      registro.set("usuario_nome", nome)
      app.saveNoValidate(registro)
    }
  }
}, (app) => {
  const COLLECTIONS = [
    { id: "pbc_303831998", fieldId: "text1780200001" },
    { id: "pbc_3275997265", fieldId: "text1780200002" },
  ]

  for (const { id, fieldId } of COLLECTIONS) {
    const collection = app.findCollectionByNameOrId(id)
    collection.fields.removeById(fieldId)
    app.save(collection)
  }
})
