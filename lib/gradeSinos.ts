// Fonte única das regras de sino/turma/carrinho do Fund I e Fund II.
// Reaproveita os mesmos JSON usados pelo validador da planilha quinzenal da
// coordenação (scripts/grade-fixa) para não duplicar a regra de negócio em
// dois lugares — ver scripts/grade-fixa/README.md para o racional completo.
import gradeSinosData from '@/scripts/grade-fixa/grade-sinos.json'
import turmasData from '@/scripts/grade-fixa/turmas.json'

export type Segmento = 'FUND1' | 'FUND2'
export type Turno = 'manha' | 'tarde'

export type TurmaConfig = {
  turma: string
  segmento: Segmento
  carrinhos_permitidos: string[]
  turno: Turno
  pb_turma: string
  pb_classe: string
}

export type PeriodoAula = {
  periodo: number
  inicio: string
  fim: string
  inicioMin: number
  fimMin: number
  confirmado: boolean
}

export const TURMAS_GRADE_FIXA: TurmaConfig[] = turmasData as TurmaConfig[]

export const CARRINHO_LABEL: Record<string, string> = {
  C1: 'Carrinho 01',
  C2: 'Carrinho 02',
  C3: 'Carrinho 03',
  C4: 'Carrinho 04',
  C5: 'Carrinho 05',
}

function paraMinutos(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// Casa a turma/classe do formulário (formato "6 ano" + "A", igual ao
// TURMAS_CONFIG já usado nas telas de agendamento) com a turma correspondente
// em turmas.json. Retorna undefined para turmas fora do Fund I/Fund II (1º-3º
// ano, Ensino Médio, Bilíngue, Uso Próprio) — essas continuam no fluxo antigo.
export function getTurmaGradeFixa(turmaChave: string, classe: string): TurmaConfig | undefined {
  return TURMAS_GRADE_FIXA.find(
    (t) => t.pb_turma === turmaChave && t.pb_classe === (classe || '')
  )
}

// Casa pelo nome completo ("6º Ano A", igual à coluna "Turma" da planilha
// semanal e ao campo `turma` de turmas.json) em vez de turma+classe separados.
export function getTurmaGradeFixaPorNome(nomeCompleto: string): TurmaConfig | undefined {
  const alvo = nomeCompleto.trim().toLowerCase()
  return TURMAS_GRADE_FIXA.find((t) => t.turma.trim().toLowerCase() === alvo)
}

export function getHorariosSegmento(segmento: Segmento): PeriodoAula[] {
  const bloco = (gradeSinosData as Record<string, { confirmado?: boolean; periodos: Record<string, { inicio: string; fim: string; confirmado?: boolean }> }>)[segmento]
  if (!bloco) return []
  const confirmadoSegmento = bloco.confirmado !== false

  return Object.entries(bloco.periodos)
    .map(([periodo, horario]) => ({
      periodo: Number(periodo),
      inicio: horario.inicio,
      fim: horario.fim,
      inicioMin: paraMinutos(horario.inicio),
      fimMin: paraMinutos(horario.fim),
      confirmado: confirmadoSegmento && horario.confirmado !== false,
    }))
    .sort((a, b) => a.periodo - b.periodo)
}

// Confirmado com a coordenacao: turno da tarde 13:30 as 18:30, 6 aulas de
// 50min corridas, sem intervalo.
const HORARIOS_TARDE: PeriodoAula[] = [
  { periodo: 1, inicio: '13:30', fim: '14:20', inicioMin: 810,  fimMin: 860,  confirmado: true },
  { periodo: 2, inicio: '14:20', fim: '15:10', inicioMin: 860,  fimMin: 910,  confirmado: true },
  { periodo: 3, inicio: '15:10', fim: '16:00', inicioMin: 910,  fimMin: 960,  confirmado: true },
  { periodo: 4, inicio: '16:00', fim: '16:50', inicioMin: 960,  fimMin: 1010, confirmado: true },
  { periodo: 5, inicio: '16:50', fim: '17:40', inicioMin: 1010, fimMin: 1060, confirmado: true },
  { periodo: 6, inicio: '17:40', fim: '18:30', inicioMin: 1060, fimMin: 1110, confirmado: true },
]

export function getHorariosTurno(segmento: Segmento, turno: Turno): PeriodoAula[] {
  return turno === 'tarde' ? HORARIOS_TARDE : getHorariosSegmento(segmento)
}

// Atalho: resolve os horarios de uma turma da grade fixa considerando o
// turno dela (manha ou tarde) — usar isso em vez de getHorariosSegmento
// direto sempre que a turma vier de getTurmaGradeFixa/getTurmaGradeFixaPorNome.
export function getHorariosDaTurma(turma: TurmaConfig): PeriodoAula[] {
  return getHorariosTurno(turma.segmento, turma.turno)
}
