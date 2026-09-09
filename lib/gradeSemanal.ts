// Trava semanal fixa dos carrinhos de Chromebook (3-9 ano, C1-C5).
//
// Diferente de scripts/grade-fixa (que importa lançamentos quinzenais com
// data real, tipo="GRADE_FIXA" em agendamentos_espacos), isto aqui é uma
// regra RECORRENTE: a mesma grade semanal se repete toda semana, sem precisar
// de import nem de reserva gravada no banco. É resolvida em tempo real a
// partir do dia da semana da data selecionada.
//
// A GRADE_SEMANAL_FIXA abaixo é só o FALLBACK usado quando a planilha do
// Google Sheets (ver /grade-fixa-semanal e GRADE_SEMANAL_SHEET_CSV_URL) não
// responde — a fonte de verdade do dia a dia é a planilha, editada pela
// coordenação. Isso aqui é o retrato da semana de 03 a 07/08/2026, pra nunca
// deixar a tela sem nenhuma trava se o Google cair.
//
// Horário do turno da tarde (turno: 'tarde') confirmado com a coordenação:
// 13:30 às 18:30, 6 aulas de 50min corridas, sem intervalo (ver
// HORARIOS_TARDE em lib/gradeSinos.ts).
import { CARRINHO_LABEL, getHorariosTurno, getTurmaGradeFixa, getTurmaGradeFixaPorNome, type Turno } from '@/lib/gradeSinos'

export type DiaSemana = 1 | 2 | 3 | 4 | 5 // Date.getDay(): 1=segunda ... 5=sexta

export type AulaFixaSemanal = {
  turmaChave: string // pb_turma, ex "6 ano" — mesmo formato do TURMAS_CONFIG das telas de agendamento
  classe: string
  diaSemana: DiaSemana
  periodo: number
  carrinho: 'C1' | 'C2' | 'C3' | 'C4' | 'C5'
  disciplina: string
  turno?: Turno // default 'manha' quando omitido
}

export const GRADE_SEMANAL_FIXA: AulaFixaSemanal[] = [
  // 6º Ano A — Carrinho 3 (manhã)
  { turmaChave: '6 ano', classe: 'A', diaSemana: 3, periodo: 1, carrinho: 'C3', disciplina: 'Inglês' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 4, periodo: 1, carrinho: 'C3', disciplina: 'Geografia' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 1, periodo: 2, carrinho: 'C3', disciplina: 'Português' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 2, periodo: 2, carrinho: 'C3', disciplina: 'Matemática' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 4, periodo: 2, carrinho: 'C3', disciplina: 'Ciências' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 5, periodo: 2, carrinho: 'C3', disciplina: 'Português' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 1, periodo: 3, carrinho: 'C3', disciplina: 'Inglês' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 2, periodo: 4, carrinho: 'C3', disciplina: 'Espanhol' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 3, periodo: 4, carrinho: 'C3', disciplina: 'Arte' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 1, periodo: 5, carrinho: 'C3', disciplina: 'Matemática' },
  { turmaChave: '6 ano', classe: 'A', diaSemana: 2, periodo: 6, carrinho: 'C3', disciplina: 'História' },

  // 7º Ano A — Carrinho 3 (manhã)
  { turmaChave: '7 ano', classe: 'A', diaSemana: 1, periodo: 1, carrinho: 'C3', disciplina: 'Português' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 1, periodo: 2, carrinho: 'C3', disciplina: 'Matemática' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 3, periodo: 2, carrinho: 'C3', disciplina: 'Português' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 4, periodo: 2, carrinho: 'C3', disciplina: 'Geografia' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 2, periodo: 3, carrinho: 'C3', disciplina: 'Ciências' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 3, periodo: 3, carrinho: 'C3', disciplina: 'Matemática' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 4, periodo: 3, carrinho: 'C3', disciplina: 'Português' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 5, periodo: 3, carrinho: 'C3', disciplina: 'Inglês' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 3, periodo: 4, carrinho: 'C3', disciplina: 'Espanhol' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 2, periodo: 5, carrinho: 'C3', disciplina: 'História' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 4, periodo: 5, carrinho: 'C3', disciplina: 'Redação' },
  { turmaChave: '7 ano', classe: 'A', diaSemana: 4, periodo: 6, carrinho: 'C3', disciplina: 'Eletiva' },

  // 8º Ano A — Carrinho 4 (manhã)
  { turmaChave: '8 ano', classe: 'A', diaSemana: 2, periodo: 1, carrinho: 'C4', disciplina: 'Ciências' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 5, periodo: 1, carrinho: 'C4', disciplina: 'Inglês' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 3, periodo: 3, carrinho: 'C4', disciplina: 'Matemática' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 1, periodo: 4, carrinho: 'C4', disciplina: 'História' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 2, periodo: 4, carrinho: 'C4', disciplina: 'Matemática' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 3, periodo: 4, carrinho: 'C4', disciplina: 'ECO' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 4, periodo: 4, carrinho: 'C4', disciplina: 'Geografia' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 1, periodo: 5, carrinho: 'C4', disciplina: 'Português' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 1, periodo: 6, carrinho: 'C4', disciplina: 'Arte' },
  { turmaChave: '8 ano', classe: 'A', diaSemana: 2, periodo: 6, carrinho: 'C4', disciplina: 'Eletiva' },

  // 6º Ano B — Carrinho 4 (tarde)
  { turmaChave: '6 ano', classe: 'B', diaSemana: 3, periodo: 1, carrinho: 'C4', disciplina: 'Ed. Tecn.', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 1, periodo: 2, carrinho: 'C4', disciplina: 'Matemática', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 2, periodo: 2, carrinho: 'C4', disciplina: 'Matemática', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 3, periodo: 2, carrinho: 'C4', disciplina: 'Eletiva', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 4, periodo: 2, carrinho: 'C4', disciplina: 'Ciências', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 2, periodo: 3, carrinho: 'C4', disciplina: 'Espanhol', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 3, periodo: 3, carrinho: 'C4', disciplina: 'Português', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 5, periodo: 3, carrinho: 'C4', disciplina: 'Matemática', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 2, periodo: 4, carrinho: 'C4', disciplina: 'Português', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 3, periodo: 4, carrinho: 'C4', disciplina: 'Arte', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 4, periodo: 4, carrinho: 'C4', disciplina: 'Geografia', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 1, periodo: 5, carrinho: 'C4', disciplina: 'Ed. Tecn.', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 3, periodo: 5, carrinho: 'C4', disciplina: 'Redação', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 1, periodo: 6, carrinho: 'C4', disciplina: 'História', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 2, periodo: 6, carrinho: 'C4', disciplina: 'ECO', turno: 'tarde' },
  { turmaChave: '6 ano', classe: 'B', diaSemana: 5, periodo: 6, carrinho: 'C4', disciplina: 'Inglês', turno: 'tarde' },

  // 7º Ano B — Carrinho 3 (tarde)
  { turmaChave: '7 ano', classe: 'B', diaSemana: 2, periodo: 2, carrinho: 'C3', disciplina: 'Ciências', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 1, periodo: 3, carrinho: 'C3', disciplina: 'Português', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 2, periodo: 3, carrinho: 'C3', disciplina: 'Português', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 5, periodo: 3, carrinho: 'C3', disciplina: 'Geografia', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 2, periodo: 4, carrinho: 'C3', disciplina: 'Matemática', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 3, periodo: 4, carrinho: 'C3', disciplina: 'Redação', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 3, periodo: 5, carrinho: 'C3', disciplina: 'Arte', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 4, periodo: 5, carrinho: 'C3', disciplina: 'Inglês', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 1, periodo: 6, carrinho: 'C3', disciplina: 'Matemática', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 3, periodo: 6, carrinho: 'C3', disciplina: 'História', turno: 'tarde' },
  { turmaChave: '7 ano', classe: 'B', diaSemana: 4, periodo: 6, carrinho: 'C3', disciplina: 'Espanhol', turno: 'tarde' },
]

export type BloqueioSemanalResolvido = {
  turmaChave: string
  classe: string
  carrinho: string // "Carrinho 0X"
  disciplina: string
  periodo: number
  inicioMin: number
  fimMin: number
}

// dataISO: "AAAA-MM-DD" (data local, sem fuso) — mesmo formato usado nas telas
// de agendamento. `fonte` permite injetar a grade vinda da planilha do Google
// Sheets (ver /grade-fixa-semanal); sem ela, cai na grade fixa deste arquivo.
export function bloqueiosSemanaisNaData(
  dataISO: string,
  fonte: AulaFixaSemanal[] = GRADE_SEMANAL_FIXA
): BloqueioSemanalResolvido[] {
  if (!dataISO) return []
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const diaSemana = new Date(ano, mes - 1, dia).getDay()
  if (diaSemana < 1 || diaSemana > 5) return []

  const resolvidos: BloqueioSemanalResolvido[] = []
  for (const aula of fonte) {
    if (aula.diaSemana !== diaSemana) continue
    const turma = getTurmaGradeFixa(aula.turmaChave, aula.classe)
    if (!turma) continue
    const horario = getHorariosTurno(turma.segmento, aula.turno || 'manha').find((h) => h.periodo === aula.periodo)
    if (!horario) continue
    resolvidos.push({
      turmaChave: aula.turmaChave,
      classe: aula.classe,
      carrinho: CARRINHO_LABEL[aula.carrinho],
      disciplina: aula.disciplina,
      periodo: aula.periodo,
      inicioMin: horario.inicioMin,
      fimMin: horario.fimMin,
    })
  }
  return resolvidos
}

// ---------------------------------------------------------------------------
// Planilha do Google Sheets (fonte editável pela coordenação)
//
// Colunas esperadas (cabeçalho na primeira linha, nessa ordem):
//   Turma | Turno | Dia da Semana | Periodo_Aula | Carrinho | Disciplina
//
// Turma: nome completo igual a turmas.json, ex. "6º Ano A".
// Turno: "Manhã" ou "Tarde".
// Dia da Semana: "Segunda".."Sexta" (aceita variações: com/sem acento, com ou
//   sem "-feira", maiúsculo/minúsculo — casa pelas 3 primeiras letras).
// Periodo_Aula: 1 a 6.
// Carrinho: "C1", "C2", "C3", "C4" ou "C5".
// ---------------------------------------------------------------------------

const CARRINHOS_VALIDOS = ['C1', 'C2', 'C3', 'C4', 'C5'] as const

function normalizarTexto(v: string) {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos (marcas combinantes pos-NFD)
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

// Parser CSV simples com suporte a campos entre aspas (podem conter virgula).
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

export function parseGradeSemanalCSV(texto: string): { linhas: AulaFixaSemanal[]; erros: string[] } {
  const erros: string[] = []
  const bruto = parseCSV(texto)
  if (bruto.length === 0) return { linhas: [], erros: ['Planilha vazia.'] }

  const cabecalho = bruto[0].map((c) => normalizarTexto(c))
  const idxTurma = cabecalho.indexOf('turma')
  const idxTurno = cabecalho.indexOf('turno')
  const idxDia = cabecalho.findIndex((c) => c.startsWith('dia'))
  const idxPeriodo = cabecalho.findIndex((c) => c.startsWith('periodo'))
  const idxCarrinho = cabecalho.indexOf('carrinho')
  const idxDisciplina = cabecalho.indexOf('disciplina')

  if ([idxTurma, idxTurno, idxDia, idxPeriodo, idxCarrinho, idxDisciplina].some((i) => i === -1)) {
    return { linhas: [], erros: ['Colunas obrigatórias ausentes. Esperado: Turma, Turno, Dia da Semana, Periodo_Aula, Carrinho, Disciplina.'] }
  }

  const linhas: AulaFixaSemanal[] = []
  for (let li = 1; li < bruto.length; li++) {
    const linha = bruto[li]
    if (linha.every((c) => c.trim() === '')) continue
    const numLinha = li + 1

    const turmaNome = (linha[idxTurma] || '').trim()
    const turnoTxt = (linha[idxTurno] || '').trim()
    const diaTxt = (linha[idxDia] || '').trim()
    const periodoTxt = (linha[idxPeriodo] || '').trim()
    const carrinhoTxt = (linha[idxCarrinho] || '').trim().toUpperCase()
    const disciplina = (linha[idxDisciplina] || '').trim()

    const turma = getTurmaGradeFixaPorNome(turmaNome)
    if (!turma) { erros.push('Linha ' + numLinha + ': turma desconhecida "' + turmaNome + '".'); continue }

    const turno = turnoPorNome(turnoTxt)
    if (!turno) { erros.push('Linha ' + numLinha + ': turno inválido "' + turnoTxt + '" (use Manhã ou Tarde).'); continue }

    const diaSemana = diaSemanaPorNome(diaTxt)
    if (!diaSemana) { erros.push('Linha ' + numLinha + ': dia da semana inválido "' + diaTxt + '".'); continue }

    const periodo = Number(periodoTxt)
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > 6) {
      erros.push('Linha ' + numLinha + ': período inválido "' + periodoTxt + '" (use 1 a 6).')
      continue
    }

    if (!CARRINHOS_VALIDOS.includes(carrinhoTxt as typeof CARRINHOS_VALIDOS[number])) {
      erros.push('Linha ' + numLinha + ': carrinho inválido "' + carrinhoTxt + '" (use C1, C2, C3, C4 ou C5).')
      continue
    }

    if (!disciplina) { erros.push('Linha ' + numLinha + ': disciplina em branco.'); continue }

    linhas.push({
      turmaChave: turma.pb_turma,
      classe: turma.pb_classe,
      diaSemana,
      periodo,
      carrinho: carrinhoTxt as AulaFixaSemanal['carrinho'],
      disciplina,
      turno,
    })
  }

  return { linhas, erros }
}
