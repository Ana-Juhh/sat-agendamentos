// Trava semanal fixa da Sala Maker (recurso único, sem carrinho/carrinhos).
//
// Mesmo mecanismo de lib/gradeSemanal.ts (grade recorrente por dia da semana,
// sincronizada de uma aba separada do Google Sheets, com fallback local) —
// ver esse arquivo para o racional completo. A diferença aqui é que não
// existe "carrinho": é um recurso só, então dois horários que batem em cima
// um do outro SEMPRE são conflito, não importa a turma.
//
// Todas as turmas bloqueadas aqui são do Fundamental II (6º-9º ano), por
// isso o sino usado é sempre FUND2 (ver getHorariosTurno em lib/gradeSinos.ts).
import { getHorariosTurno, type Turno } from '@/lib/gradeSinos'

export type DiaSemana = 1 | 2 | 3 | 4 | 5 // Date.getDay(): 1=segunda ... 5=sexta

export type AulaFixaMaker = {
  turmaChave: string // formato da TURMAS_CONFIG do proprio maker/page.tsx, ex "6º ano"
  classe: string
  diaSemana: DiaSemana
  periodo: number
  turno: Turno
  disciplina?: string
}

// Nome de exibicao (planilha) -> chave interna usada pelo formulario do Maker.
const TURMAS_MAKER: { nome: string; turmaChave: string; classe: string }[] = [
  { nome: '6º Ano A', turmaChave: '6º ano', classe: 'A' },
  { nome: '6º Ano B', turmaChave: '6º ano', classe: 'B' },
  { nome: '7º Ano A', turmaChave: '7º ano', classe: 'A' },
  { nome: '7º Ano B', turmaChave: '7º ano', classe: 'B' },
  { nome: '8º Ano A', turmaChave: '8º ano', classe: 'A' },
  { nome: '8º Ano B', turmaChave: '8º ano', classe: 'B' },
  { nome: '9º Ano A', turmaChave: '9º ano', classe: 'A' },
  { nome: '9º Ano B', turmaChave: '9º ano', classe: 'B' },
]

function getTurmaMakerPorNome(nome: string) {
  const alvo = nome.trim().toLowerCase()
  return TURMAS_MAKER.find((t) => t.nome.toLowerCase() === alvo)
}

// Grade informada em 2026-09-10. Nenhum bloqueio na quinta-feira.
export const GRADE_MAKER_FIXA: AulaFixaMaker[] = [
  // Segunda
  { turmaChave: '6º ano', classe: 'A', diaSemana: 1, periodo: 6, turno: 'manha' },
  { turmaChave: '6º ano', classe: 'B', diaSemana: 1, periodo: 5, turno: 'tarde' },

  // Terça
  { turmaChave: '8º ano', classe: 'A', diaSemana: 2, periodo: 5, turno: 'manha' },
  { turmaChave: '9º ano', classe: 'B', diaSemana: 2, periodo: 2, turno: 'tarde' },
  { turmaChave: '7º ano', classe: 'B', diaSemana: 2, periodo: 6, turno: 'tarde' },

  // Quarta
  { turmaChave: '8º ano', classe: 'A', diaSemana: 3, periodo: 1, turno: 'manha' },
  { turmaChave: '6º ano', classe: 'A', diaSemana: 3, periodo: 2, turno: 'manha' },
  { turmaChave: '7º ano', classe: 'A', diaSemana: 3, periodo: 5, turno: 'manha' },
  { turmaChave: '7º ano', classe: 'A', diaSemana: 3, periodo: 6, turno: 'manha' },
  { turmaChave: '6º ano', classe: 'B', diaSemana: 3, periodo: 1, turno: 'tarde' },
  { turmaChave: '7º ano', classe: 'B', diaSemana: 3, periodo: 3, turno: 'tarde' },
  { turmaChave: '8º ano', classe: 'B', diaSemana: 3, periodo: 4, turno: 'tarde' },
  { turmaChave: '8º ano', classe: 'B', diaSemana: 3, periodo: 5, turno: 'tarde' },

  // Sexta
  { turmaChave: '9º ano', classe: 'A', diaSemana: 5, periodo: 6, turno: 'manha' },
]

export type BloqueioMakerResolvido = {
  turmaChave: string
  classe: string
  periodo: number
  turno: Turno
  disciplina?: string
  inicioMin: number
  fimMin: number
}

export function bloqueiosMakerNaData(
  dataISO: string,
  fonte: AulaFixaMaker[] = GRADE_MAKER_FIXA
): BloqueioMakerResolvido[] {
  if (!dataISO) return []
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const diaSemana = new Date(ano, mes - 1, dia).getDay()
  if (diaSemana < 1 || diaSemana > 5) return []

  const resolvidos: BloqueioMakerResolvido[] = []
  for (const aula of fonte) {
    if (aula.diaSemana !== diaSemana) continue
    const horario = getHorariosTurno('FUND2', aula.turno).find((h) => h.periodo === aula.periodo)
    if (!horario) continue
    resolvidos.push({
      turmaChave: aula.turmaChave,
      classe: aula.classe,
      periodo: aula.periodo,
      turno: aula.turno,
      disciplina: aula.disciplina,
      inicioMin: horario.inicioMin,
      fimMin: horario.fimMin,
    })
  }
  return resolvidos
}

// ---------------------------------------------------------------------------
// Planilha do Google Sheets (aba separada da grade dos carrinhos)
//
// Colunas esperadas (cabeçalho na primeira linha, nessa ordem):
//   Turma | Turno | Dia da Semana | Periodo_Aula | Disciplina
//
// Turma: "6º Ano A".."9º Ano B" (só Fundamental II usa a Sala Maker hoje).
// Turno: "Manhã" ou "Tarde".
// Dia da Semana: "Segunda".."Sexta" (tolera variações de acento/maiúscula).
// Periodo_Aula: 1 a 6.
// Disciplina: opcional, texto livre.
// ---------------------------------------------------------------------------

function normalizarTexto(v: string) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

function diaSemanaPorNome(v: string): DiaSemana | null {
  const n = normalizarTexto(v).slice(0, 3)
  if (n === 'seg') return 1
  if (n === 'ter') return 2
  if (n === 'qua') return 3
  if (n === 'qui') return 4
  if (n === 'sex') return 5
  return null
}

function turnoPorNome(v: string): Turno | null {
  const n = normalizarTexto(v)
  if (n.startsWith('man')) return 'manha'
  if (n.startsWith('tar')) return 'tarde'
  return null
}

function parseCSV(texto: string): string[][] {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
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

export function parseGradeMakerCSV(texto: string): { linhas: AulaFixaMaker[]; erros: string[] } {
  const erros: string[] = []
  const bruto = parseCSV(texto)
  if (bruto.length === 0) return { linhas: [], erros: ['Planilha vazia.'] }

  const cabecalho = bruto[0].map((c) => normalizarTexto(c))
  const idxTurma = cabecalho.indexOf('turma')
  const idxTurno = cabecalho.indexOf('turno')
  const idxDia = cabecalho.findIndex((c) => c.startsWith('dia'))
  const idxPeriodo = cabecalho.findIndex((c) => c.startsWith('periodo'))
  const idxDisciplina = cabecalho.indexOf('disciplina')

  if ([idxTurma, idxTurno, idxDia, idxPeriodo].some((i) => i === -1)) {
    return { linhas: [], erros: ['Colunas obrigatórias ausentes. Esperado: Turma, Turno, Dia da Semana, Periodo_Aula.'] }
  }

  const linhas: AulaFixaMaker[] = []
  for (let li = 1; li < bruto.length; li++) {
    const linha = bruto[li]
    if (linha.every((c) => c.trim() === '')) continue
    const numLinha = li + 1

    const turmaNome = (linha[idxTurma] || '').trim()
    const turnoTxt = (linha[idxTurno] || '').trim()
    const diaTxt = (linha[idxDia] || '').trim()
    const periodoTxt = (linha[idxPeriodo] || '').trim()
    const disciplina = idxDisciplina !== -1 ? (linha[idxDisciplina] || '').trim() : ''

    const turma = getTurmaMakerPorNome(turmaNome)
    if (!turma) { erros.push('Linha ' + numLinha + ': turma desconhecida "' + turmaNome + '" (só 6º-9º ano A/B usam a Sala Maker).'); continue }

    const turno = turnoPorNome(turnoTxt)
    if (!turno) { erros.push('Linha ' + numLinha + ': turno inválido "' + turnoTxt + '" (use Manhã ou Tarde).'); continue }

    const diaSemana = diaSemanaPorNome(diaTxt)
    if (!diaSemana) { erros.push('Linha ' + numLinha + ': dia da semana inválido "' + diaTxt + '".'); continue }

    const periodo = Number(periodoTxt)
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > 6) {
      erros.push('Linha ' + numLinha + ': período inválido "' + periodoTxt + '" (use 1 a 6).')
      continue
    }

    linhas.push({
      turmaChave: turma.turmaChave,
      classe: turma.classe,
      diaSemana,
      periodo,
      turno,
      disciplina: disciplina || undefined,
    })
  }

  return { linhas, erros }
}
