#!/usr/bin/env node
'use strict'

/*
 * Valida a planilha quinzenal de agendamento de carrinhos (GRADE_FIXA) antes de importar.
 *
 * Uso:
 *   node validar-agendamentos.js <arquivo.csv>
 *   node validar-agendamentos.js <arquivo.csv> --json saida.json
 *
 * Sem --json, so valida e imprime erros/avisos (exit code 1 se houver erro).
 * Com --json, alem de validar, grava os registros resolvidos (com hora_inicio/
 * hora_fim calculados via grade-sinos.json) prontos para importar na collection
 * agendamentos_espacos do PocketBase, com tipo="GRADE_FIXA".
 */

const fs = require('fs')
const path = require('path')

const REQUIRED_COLUMNS = ['Data', 'Turma', 'Periodo_Aula', 'Carrinho_ID', 'Disciplina']
const CARRINHOS_VALIDOS = ['C1', 'C2', 'C3', 'C4', 'C5']
// Mesmo formato de texto ja usado pela tela de agendamento avulso de
// carrinhos (agendamentos_espacos.carrinho e' um campo texto livre, nao
// numero) -- ver lib/gradeSinos.ts (CARRINHO_LABEL).
const CARRINHO_LABEL = { C1: 'Carrinho 01', C2: 'Carrinho 02', C3: 'Carrinho 03', C4: 'Carrinho 04', C5: 'Carrinho 05' }

function carregarJSON(nomeArquivo) {
  const p = path.join(__dirname, nomeArquivo)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

// Parser CSV simples com suporte a campos entre aspas (podem conter virgula).
function parseCSV(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let dentroDeAspas = false
  const normalizado = texto.replace(/\r\n/g, '\n')

  for (let i = 0; i < normalizado.length; i++) {
    const c = normalizado[i]
    if (dentroDeAspas) {
      if (c === '"') {
        if (normalizado[i + 1] === '"') { campo += '"'; i++ } else { dentroDeAspas = false }
      } else {
        campo += c
      }
      continue
    }
    if (c === '"') { dentroDeAspas = true; continue }
    if (c === ',') { linha.push(campo); campo = ''; continue }
    if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; continue }
    campo += c
  }
  if (campo.length > 0 || linha.length > 0) { linha.push(campo); linhas.push(linha) }

  return linhas.filter((l) => !(l.length === 1 && l[0].trim() === ''))
}

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function dataValida(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false
  const [ano, mes, dia] = str.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia
}

function validar(caminhoCSV) {
  const gradeSinos = carregarJSON('grade-sinos.json')
  const turmas = carregarJSON('turmas.json')
  const turmasPorNome = new Map(turmas.map((t) => [t.turma, t]))

  const erros = []
  const avisos = []
  const registros = []

  const textoCSV = fs.readFileSync(caminhoCSV, 'utf8')
  const linhas = parseCSV(textoCSV)

  if (linhas.length === 0) {
    erros.push('Planilha vazia.')
    return { erros, avisos, registros }
  }

  const cabecalho = linhas[0].map((c) => c.trim())
  for (const col of REQUIRED_COLUMNS) {
    if (!cabecalho.includes(col)) erros.push(`Coluna obrigatória ausente: "${col}"`)
  }
  if (erros.length > 0) return { erros, avisos, registros }

  const idx = {}
  cabecalho.forEach((nome, i) => { idx[nome] = i })
  const temObservacoes = idx['Observacoes'] !== undefined

  const vistos = new Map() // "turma|data|periodo" -> numero da linha

  for (let li = 1; li < linhas.length; li++) {
    const linha = linhas[li]
    if (linha.every((c) => c.trim() === '')) continue
    const numLinha = li + 1 // 1-based, contando o cabecalho como linha 1
    const get = (col) => (linha[idx[col]] || '').trim()

    const data = get('Data')
    const turmaNome = get('Turma')
    const periodoStr = get('Periodo_Aula')
    const carrinho = get('Carrinho_ID')
    const disciplina = get('Disciplina')
    const observacoes = temObservacoes ? get('Observacoes') : ''

    let linhaValida = true

    if (!dataValida(data)) {
      erros.push(`Linha ${numLinha}: Data inválida ("${data}"). Use o formato AAAA-MM-DD.`)
      linhaValida = false
    }

    const turma = turmasPorNome.get(turmaNome)
    if (!turma) {
      erros.push(`Linha ${numLinha}: Turma desconhecida ("${turmaNome}"). Verifique a lista de turmas permitidas em turmas.json.`)
      linhaValida = false
    }

    const periodo = Number(periodoStr)
    if (periodoStr === '' || !Number.isInteger(periodo)) {
      erros.push(`Linha ${numLinha}: Periodo_Aula inválido ("${periodoStr}"). Deve ser um número inteiro (1, 2, 3...).`)
      linhaValida = false
    }

    if (!CARRINHOS_VALIDOS.includes(carrinho)) {
      erros.push(`Linha ${numLinha}: Carrinho_ID inválido ("${carrinho}"). Valores aceitos: ${CARRINHOS_VALIDOS.join(', ')}.`)
      linhaValida = false
    }

    if (!disciplina) {
      erros.push(`Linha ${numLinha}: Disciplina não pode ficar em branco.`)
      linhaValida = false
    }

    if (!linhaValida) continue

    const segmento = turma.segmento
    const sinos = gradeSinos[segmento]
    const bloco = sinos && sinos.periodos[String(periodo)]
    if (!bloco) {
      erros.push(`Linha ${numLinha}: não existe período ${periodo} cadastrado para o segmento ${segmento} (turma "${turmaNome}"). Confira grade-sinos.json.`)
      continue
    }
    if (sinos.confirmado === false || bloco.confirmado === false) {
      avisos.push(`Linha ${numLinha}: horário do período ${periodo} do segmento ${segmento} ainda é PROVISÓRIO em grade-sinos.json (não confirmado com a coordenação).`)
    }

    if (!turma.carrinhos_permitidos.includes(carrinho)) {
      avisos.push(`Linha ${numLinha}: a turma "${turmaNome}" normalmente usa ${turma.carrinhos_permitidos.join('/')} , não ${carrinho}. Confira se não é erro de digitação.`)
    }

    const chave = `${turmaNome}|${data}|${periodo}`
    if (vistos.has(chave)) {
      erros.push(`Linha ${numLinha}: duplicado — a turma "${turmaNome}" já tem uma reserva na linha ${vistos.get(chave)} para ${data}, período ${periodo}.`)
      continue
    }
    vistos.set(chave, numLinha)

    registros.push({
      linha: numLinha,
      data,
      turma: turmaNome,
      pbTurma: turma.pb_turma,
      pbClasse: turma.pb_classe,
      segmento,
      periodo,
      carrinho,
      disciplina,
      observacoes,
      horaInicio: bloco.inicio,
      horaFim: bloco.fim,
      inicioMin: paraMinutos(bloco.inicio),
      fimMin: paraMinutos(bloco.fim),
    })
  }

  // Conflito real de agenda: mesmo carrinho, mesma data, horarios em minutos que se
  // sobrepoem, entre turmas diferentes -- inclusive entre uma turma FUND1 e uma FUND2.
  for (let i = 0; i < registros.length; i++) {
    for (let j = i + 1; j < registros.length; j++) {
      const a = registros[i]
      const b = registros[j]
      if (a.carrinho !== b.carrinho) continue
      if (a.data !== b.data) continue
      if (a.turma === b.turma) continue
      const sobrepoe = a.inicioMin < b.fimMin && a.fimMin > b.inicioMin
      if (sobrepoe) {
        erros.push(
          `Conflito de agenda: carrinho ${a.carrinho} em ${a.data} está reservado por "${a.turma}" ` +
          `(${a.horaInicio}-${a.horaFim}, ${a.segmento}, linha ${a.linha}) e por "${b.turma}" ` +
          `(${b.horaInicio}-${b.horaFim}, ${b.segmento}, linha ${b.linha}) — os horários se sobrepõem.`
        )
      }
    }
  }

  return { erros, avisos, registros }
}

function main() {
  const args = process.argv.slice(2)
  const caminhoCSV = args[0]
  if (!caminhoCSV) {
    console.error('Uso: node validar-agendamentos.js <arquivo.csv> [--json saida.json]')
    process.exit(1)
  }

  const idxJson = args.indexOf('--json')
  const saidaJson = idxJson !== -1 ? args[idxJson + 1] : null

  const { erros, avisos, registros } = validar(caminhoCSV)

  if (avisos.length > 0) {
    console.log(`\n⚠ ${avisos.length} aviso(s):`)
    avisos.forEach((a) => console.log(`  - ${a}`))
  }

  if (erros.length > 0) {
    console.log(`\n✗ ${erros.length} erro(s) — corrija antes de importar:`)
    erros.forEach((e) => console.log(`  - ${e}`))
    process.exit(1)
  }

  console.log(`\n✓ ${registros.length} agendamento(s) válidos. Nenhum conflito de agenda encontrado.`)

  if (saidaJson) {
    const gradeFixa = registros.map((r) => ({
      tipo: 'GRADE_FIXA',
      carrinho: CARRINHO_LABEL[r.carrinho],
      data: r.data,
      inicio: r.inicioMin,
      fim: r.fimMin,
      turma: r.pbTurma,
      classe: r.pbClasse,
      disciplina: r.disciplina,
      observacoes: r.observacoes,
      status: 'ativo',
      status_entrega: 'pendente',
    }))
    fs.writeFileSync(saidaJson, JSON.stringify(gradeFixa, null, 2), 'utf8')
    console.log(`Registros resolvidos gravados em ${saidaJson}`)
  }
}

if (require.main === module) main()

module.exports = { validar, parseCSV, dataValida, paraMinutos }
