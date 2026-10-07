/// <reference path="../pb_data/types.d.ts" />

// A tela da Wiki de TI libera a leitura pra todo cargo que o front trata
// como admin (isAdmin em lib/roles.ts: admin, professor, estagiarios e
// superadmin), mas a regra do banco so aceitava "admin" e "superadmin".
// Resultado: o card aparecia, mas a lista voltava vazia. Aqui a regra de
// leitura passa a seguir o mesmo criterio. Criar/editar/apagar continua so
// com o superadmin.
migrate((app) => {
  const regraLeitura =
    "@request.auth.role = \"superadmin\" || " +
    "@request.auth.role = \"admin\" || " +
    "@request.auth.role = \"professor\" || " +
    "@request.auth.role = \"estagiario_manha\" || " +
    "@request.auth.role = \"estagiario_tarde\""

  for (const id of ["pbc_4819203746", "pbc_4819203751"]) {
    const collection = app.findCollectionByNameOrId(id)

    unmarshal({
      "listRule": regraLeitura,
      "viewRule": regraLeitura
    }, collection)

    app.save(collection)
  }
}, (app) => {
  const regraAnterior =
    "@request.auth.role = \"admin\" || @request.auth.role = \"superadmin\""

  for (const id of ["pbc_4819203746", "pbc_4819203751"]) {
    const collection = app.findCollectionByNameOrId(id)

    unmarshal({
      "listRule": regraAnterior,
      "viewRule": regraAnterior
    }, collection)

    app.save(collection)
  }
})
