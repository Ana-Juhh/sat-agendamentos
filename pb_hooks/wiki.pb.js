/// <reference path="../pb_data/types.d.ts" />

// Regras de servidor da Wiki de TI (acompanhamento dos estagiarios).
// Obs.: o PocketBase roda cada handler isolado (nao enxerga funcoes de
// fora), por isso cada um e autocontido.

// Resposta de atividade: o servidor define quem respondeu e corrige usando o
// gabarito (que o estagiario nao consegue ler). O que vier do navegador em
// usuario/acertou/correta/explicacao e ignorado.
onRecordCreateRequest((e) => {
  if (!e.auth) {
    throw new ForbiddenError("Faça login para responder a atividade.")
  }

  const questaoId = e.record.getString("questao")
  let questao
  try {
    questao = e.app.findRecordById("questoes_wiki", questaoId)
  } catch (_) {
    throw new BadRequestError("Questão não encontrada.")
  }

  let alternativas = []
  try {
    alternativas = JSON.parse(questao.getString("alternativas")) || []
  } catch (_) {
    alternativas = []
  }

  const escolhida = e.record.getInt("alternativa")
  if (escolhida < 0 || escolhida >= alternativas.length) {
    throw new BadRequestError("Escolha uma das alternativas.")
  }

  let correta = -1
  let explicacao = ""
  try {
    const gabarito = e.app.findFirstRecordByFilter("gabaritos_wiki", "questao = {:questao}", { questao: questaoId })
    correta = gabarito.getInt("correta")
    explicacao = gabarito.getString("explicacao")
  } catch (_) {
    throw new BadRequestError("Esta questão ainda não tem resposta certa cadastrada.")
  }

  e.record.set("usuario", e.auth.id)
  e.record.set("pagina", questao.getString("pagina"))
  e.record.set("acertou", escolhida === correta)
  e.record.set("correta", correta)
  e.record.set("explicacao", explicacao)

  e.next()
}, "respostas_wiki")

// Progresso: cada um so grava o proprio. A data de conclusao e do servidor.
onRecordCreateRequest((e) => {
  if (!e.auth) {
    throw new ForbiddenError("Faça login para registrar o progresso.")
  }

  e.record.set("usuario", e.auth.id)
  if (e.record.getBool("concluida")) {
    e.record.set("concluida_em", new DateTime())
  }

  e.next()
}, "progresso_wiki")

onRecordUpdateRequest((e) => {
  const original = e.record.original()

  // Nao deixa trocar de dono nem de pagina.
  e.record.set("usuario", original.getString("usuario"))
  e.record.set("pagina", original.getString("pagina"))

  const concluida = e.record.getBool("concluida")
  if (concluida && !original.getBool("concluida")) {
    e.record.set("concluida_em", new DateTime())
  } else if (!concluida) {
    e.record.set("concluida_em", "")
  }

  e.next()
}, "progresso_wiki")
