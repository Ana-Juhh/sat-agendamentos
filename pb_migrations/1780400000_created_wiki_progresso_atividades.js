/// <reference path="../pb_data/types.d.ts" />

// Acompanhamento dos estagiarios na Wiki de TI:
// - progresso_wiki: quem abriu cada pagina, quantas vezes, e se concluiu;
// - questoes_wiki: atividades de multipla escolha de cada aula;
// - gabaritos_wiki: resposta certa + explicacao, separada das questoes e
//   legivel so pelo superadmin (senao daria pra "colar" pela API);
// - respostas_wiki: resposta de cada pessoa. A correcao e feita no servidor
//   (pb_hooks/wiki.pb.js), que preenche acertou/correta/explicacao.
migrate((app) => {
  const LEITURA_WIKI =
    "@request.auth.role = \"superadmin\" || " +
    "@request.auth.role = \"admin\" || " +
    "@request.auth.role = \"professor\" || " +
    "@request.auth.role = \"estagiario_manha\" || " +
    "@request.auth.role = \"estagiario_tarde\""
  const SUPERADMIN = "@request.auth.role = \"superadmin\""
  const DONO_OU_SUPERADMIN = "usuario = @request.auth.id || " + SUPERADMIN

  function datas(prefixo) {
    return [
      { "hidden": false, "id": prefixo + "c", "name": "created", "onCreate": true, "onUpdate": false, "presentable": false, "system": false, "type": "autodate" },
      { "hidden": false, "id": prefixo + "u", "name": "updated", "onCreate": true, "onUpdate": true, "presentable": false, "system": false, "type": "autodate" },
    ]
  }

  function id(prefixo) {
    return { "autogeneratePattern": "[a-z0-9]{15}", "hidden": false, "id": prefixo + "id", "max": 15, "min": 15, "name": "id", "pattern": "^[a-z0-9]+$", "presentable": false, "primaryKey": true, "required": true, "system": true, "type": "text" }
  }

  function relacao(idCampo, nome, colecao, obrigatorio) {
    return { "cascadeDelete": true, "collectionId": colecao, "hidden": false, "id": idCampo, "maxSelect": 1, "minSelect": 0, "name": nome, "presentable": false, "required": obrigatorio, "system": false, "type": "relation" }
  }

  function texto(idCampo, nome, obrigatorio) {
    return { "autogeneratePattern": "", "hidden": false, "id": idCampo, "max": 0, "min": 0, "name": nome, "pattern": "", "presentable": false, "primaryKey": false, "required": obrigatorio, "system": false, "type": "text" }
  }

  function numero(idCampo, nome) {
    return { "hidden": false, "id": idCampo, "max": null, "min": 0, "name": nome, "onlyInt": true, "presentable": false, "required": false, "system": false, "type": "number" }
  }

  function booleano(idCampo, nome) {
    return { "hidden": false, "id": idCampo, "name": nome, "presentable": false, "required": false, "system": false, "type": "bool" }
  }

  function data(idCampo, nome) {
    return { "hidden": false, "id": idCampo, "max": "", "min": "", "name": nome, "presentable": false, "required": false, "system": false, "type": "date" }
  }

  const progresso = new Collection({
    "id": "pbc_4819203800",
    "name": "progresso_wiki",
    "type": "base",
    "system": false,
    "fields": [
      id("wprog"),
      relacao("wprogusuario", "usuario", "_pb_users_auth_", true),
      relacao("wprogpagina", "pagina", "pbc_4819203751", true),
      numero("wprogvisitas", "visitas"),
      data("wprogprimeira", "primeira_visita"),
      data("wprogultima", "ultima_visita"),
      booleano("wprogconcluida", "concluida"),
      data("wprogconcluidaem", "concluida_em"),
      ...datas("wprog"),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_progresso_wiki_usuario_pagina ON progresso_wiki (usuario, pagina)"],
    "listRule": DONO_OU_SUPERADMIN,
    "viewRule": DONO_OU_SUPERADMIN,
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "usuario = @request.auth.id",
    "deleteRule": SUPERADMIN,
  })
  app.save(progresso)

  const questoes = new Collection({
    "id": "pbc_4819203810",
    "name": "questoes_wiki",
    "type": "base",
    "system": false,
    "fields": [
      id("wquest"),
      relacao("wquestpagina", "pagina", "pbc_4819203751", true),
      texto("wquestenunciado", "enunciado", true),
      { "hidden": false, "id": "wquestalternativas", "maxSize": 0, "name": "alternativas", "presentable": false, "required": true, "system": false, "type": "json" },
      numero("wquestordem", "ordem"),
      ...datas("wquest"),
    ],
    "indexes": [],
    "listRule": LEITURA_WIKI,
    "viewRule": LEITURA_WIKI,
    "createRule": SUPERADMIN,
    "updateRule": SUPERADMIN,
    "deleteRule": SUPERADMIN,
  })
  app.save(questoes)

  const gabaritos = new Collection({
    "id": "pbc_4819203820",
    "name": "gabaritos_wiki",
    "type": "base",
    "system": false,
    "fields": [
      id("wgab"),
      relacao("wgabquestao", "questao", "pbc_4819203810", true),
      numero("wgabcorreta", "correta"),
      texto("wgabexplicacao", "explicacao", false),
      ...datas("wgab"),
    ],
    "indexes": ["CREATE UNIQUE INDEX idx_gabaritos_wiki_questao ON gabaritos_wiki (questao)"],
    "listRule": SUPERADMIN,
    "viewRule": SUPERADMIN,
    "createRule": SUPERADMIN,
    "updateRule": SUPERADMIN,
    "deleteRule": SUPERADMIN,
  })
  app.save(gabaritos)

  const respostas = new Collection({
    "id": "pbc_4819203830",
    "name": "respostas_wiki",
    "type": "base",
    "system": false,
    "fields": [
      id("wresp"),
      relacao("wrespusuario", "usuario", "_pb_users_auth_", false),
      relacao("wrespquestao", "questao", "pbc_4819203810", true),
      relacao("wresppagina", "pagina", "pbc_4819203751", false),
      numero("wrespalternativa", "alternativa"),
      booleano("wrespacertou", "acertou"),
      numero("wrespcorreta", "correta"),
      texto("wrespexplicacao", "explicacao", false),
      ...datas("wresp"),
    ],
    // Uma tentativa por questao: e isso que mostra se a pessoa aprendeu.
    // O superadmin pode apagar a resposta pra liberar outra tentativa.
    "indexes": ["CREATE UNIQUE INDEX idx_respostas_wiki_usuario_questao ON respostas_wiki (usuario, questao)"],
    "listRule": DONO_OU_SUPERADMIN,
    "viewRule": DONO_OU_SUPERADMIN,
    "createRule": "@request.auth.id != \"\"",
    "updateRule": null,
    "deleteRule": SUPERADMIN,
  })
  app.save(respostas)
}, (app) => {
  for (const id of ["pbc_4819203830", "pbc_4819203820", "pbc_4819203810", "pbc_4819203800"]) {
    app.delete(app.findCollectionByNameOrId(id))
  }
})
