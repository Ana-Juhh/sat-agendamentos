'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import BackButton from '@/components/BackButton'

type Chromebook = {
  id: string
  codigo: string
  status?: string
}

type ReservaChromebook = {
  data?: string
  inicio?: number
  fim?: number
  chromebooks?: string[]
  expand?: {
    chromebooks?: Chromebook[]
  }
}

type AuthUser = {
  id?: string
  collectionName?: string
}

const TURMAS_CONFIG: Record<string, string[]> = {
  'Uso Próprio': [],
  '1º ano': ['A', 'B', 'C', 'D'],
  '2º ano': ['A', 'B', 'C'],
  '3º ano': ['A', 'B', 'C'],
  '4º ano': ['A', 'B', 'C'],
  '5º ano': ['A', 'B'],
  '6º ano': ['A', 'B'],
  '7º ano': ['A', 'B'],
  '8º ano': ['A', 'B'],
  '9º ano': ['A', 'B'],
  '1ª série': ['A', 'B'],
  '2ª série': ['A', 'B'],
  '3ª série': ['A', 'B'],
  Bilíngue: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y8', 'Y9', 'K2', 'K3', 'Hs2', 'Hs3'],
}

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function minutosAte(data: string, hora: string) {
  if (!data || !hora) return Number.POSITIVE_INFINITY
  const [h, m] = hora.split(':').map(Number)
  const alvo = new Date(`${data}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
  const agora = new Date()
  return Math.floor((alvo.getTime() - agora.getTime()) / 60000)
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function NovoAgendamentoChromebooks() {
  const router = useRouter()

  const [chromebooks, setChromebooks] = useState<Chromebook[]>([])
  const [carregandoChromes, setCarregandoChromes] = useState(true)

  const [chromebookIds, setChromebookIds] = useState<string[]>([])
  const [ocupadosNoHorario, setOcupadosNoHorario] = useState<string[]>([])

  const [data, setData] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')

  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [loading, setLoading] = useState(false)
  const [verificandoDisponibilidade, setVerificandoDisponibilidade] = useState(false)

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push('/login')
      return
    }

    async function carregarChromebooks() {
      try {
        setCarregandoChromes(true)

        const lista = await pb.collection('chromebooks').getFullList<Chromebook>({
          filter: 'tipo = "agendamento"',
          sort: 'codigo',
        })

        setChromebooks(lista)
      } catch (e) {
        console.error(e)
        alert('Erro ao carregar chromebooks')
      } finally {
        setCarregandoChromes(false)
      }
    }

    void carregarChromebooks()
  }, [router])

  const selecionados = useMemo(() => {
    const map = new Map(chromebooks.map((c) => [c.id, c]))
    return chromebookIds.map((id) => map.get(id)).filter(Boolean) as Chromebook[]
  }, [chromebooks, chromebookIds])

  const limite = useMemo(() => {
    const faltam = minutosAte(data, inicio)
    return faltam < 60 ? 5 : 999
  }, [data, inicio])

  const opcoesClasse = turma ? TURMAS_CONFIG[turma] || [] : []
  const classeObrigatoria = opcoesClasse.length > 0

  function chromeOcupadoNoHorario(c: Chromebook) {
    return ocupadosNoHorario.includes(c.id)
  }

  function chromeDisponivel(c: Chromebook) {
    const statusOk = (c.status || 'disponivel') === 'disponivel'
    const livreNoHorario = !chromeOcupadoNoHorario(c)
    return statusOk && livreNoHorario
  }

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  function toggleChromebook(id: string) {
    const chrome = chromebooks.find((c) => c.id === id)
    if (!chrome) return
    if (verificandoDisponibilidade) return
    if (!chromeDisponivel(chrome)) return

    setChromebookIds((prev) => {
      const existe = prev.includes(id)
      if (existe) return prev.filter((x) => x !== id)

      if (prev.length >= limite) {
        alert(`Nesse horário você pode selecionar no máximo ${limite} chromebooks.`)
        return prev
      }

      return [...prev, id]
    })
  }

  async function buscarIdsOcupadosNoHorario(dataISO: string, inicioMin: number, fimMin: number) {
    const reservas = await pb.collection(AG_COLLECTION).getFullList<ReservaChromebook>({
      filter: `status = "ativo" && inicio < ${fimMin} && fim > ${inicioMin}`,
      expand: 'chromebooks',
      sort: 'data,inicio',
      requestKey: null,
    })

    return Array.from(
      new Set(
        reservas
          .filter((r) => normalizarDataISO(r.data || '') === dataISO)
          .flatMap((r) => {
            const idsExpand = r.expand?.chromebooks?.map((c) => c.id) ?? []
            const idsRaw = r.chromebooks ?? []
            return idsExpand.length ? idsExpand : idsRaw
          }),
      ),
    )
  }

  useEffect(() => {
    setChromebookIds((prev) => prev.filter((id) => !ocupadosNoHorario.includes(id)))
  }, [ocupadosNoHorario])

  useEffect(() => {
    if (!data || !inicio || !fim) {
      setOcupadosNoHorario([])
      return
    }

    const dataISO = normalizarDataISO(data)
    const inicioMin = horaParaMinutos(inicio)
    const fimMin = horaParaMinutos(fim)

    if (!Number.isFinite(inicioMin) || !Number.isFinite(fimMin) || fimMin <= inicioMin) {
      setOcupadosNoHorario([])
      return
    }

    let ativo = true

    async function verificarDisponibilidade() {
      try {
        setVerificandoDisponibilidade(true)
        const ids = await buscarIdsOcupadosNoHorario(dataISO, inicioMin, fimMin)
        if (ativo) setOcupadosNoHorario(ids)
      } catch (e) {
        console.error('Erro ao verificar disponibilidade:', e)
        if (ativo) setOcupadosNoHorario([])
      } finally {
        if (ativo) setVerificandoDisponibilidade(false)
      }
    }

    void verificarDisponibilidade()

    return () => {
      ativo = false
    }
  }, [data, inicio, fim])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (chromebookIds.length === 0) {
      alert('Selecione pelo menos 1 Chromebook')
      return
    }

    if (!data || !inicio || !fim) {
      alert('Preencha data, início e fim')
      return
    }

    if (!turma) {
      alert('Selecione a turma')
      return
    }

    if (classeObrigatoria && !classe) {
      alert('Selecione a classe')
      return
    }

    const authModel = pb.authStore.model as AuthUser | null
    const usuarioId = authModel?.id
    const collectionName = authModel?.collectionName

    if (!usuarioId || collectionName !== 'users') {
      alert('Usuário não autenticado corretamente (faça login como users).')
      return
    }

    const dataISO = normalizarDataISO(data)
    const inicioMin = horaParaMinutos(inicio)
    const fimMin = horaParaMinutos(fim)

    if (!Number.isFinite(inicioMin) || !Number.isFinite(fimMin)) {
      alert('Horários inválidos')
      return
    }

    if (fimMin <= inicioMin) {
      alert('Horário final deve ser maior que o inicial')
      return
    }

    if (chromebookIds.length > limite) {
      alert(`Nesse horário você pode agendar no máximo ${limite} chromebooks.`)
      return
    }

    setLoading(true)
    try {
      const idsOcupadosAtualizados = await buscarIdsOcupadosNoHorario(dataISO, inicioMin, fimMin)
      const idsEmConflito = chromebookIds.filter((id) => idsOcupadosAtualizados.includes(id))

      if (idsEmConflito.length > 0) {
        setOcupadosNoHorario(idsOcupadosAtualizados)

        const codigosEmConflito = chromebooks
          .filter((c) => idsEmConflito.includes(c.id))
          .map((c) => c.codigo ?? c.id)

        alert(
          `Os seguintes Chromebooks já estão reservados nesse horário: ${codigosEmConflito.join(', ')}.`,
        )
        return
      }

      await esperar(350)

      const idsOcupadosConfirmados = await buscarIdsOcupadosNoHorario(dataISO, inicioMin, fimMin)
      const idsEmConflitoConfirmados = chromebookIds.filter((id) =>
        idsOcupadosConfirmados.includes(id),
      )

      if (idsEmConflitoConfirmados.length > 0) {
        setOcupadosNoHorario(idsOcupadosConfirmados)

        const codigosEmConflito = chromebooks
          .filter((c) => idsEmConflitoConfirmados.includes(c.id))
          .map((c) => c.codigo ?? c.id)

        alert(
          `Os seguintes Chromebooks já estão reservados nesse horário: ${codigosEmConflito.join(', ')}.`,
        )
        return
      }

      await pb.collection(AG_COLLECTION).create({
        usuario: String(usuarioId),
        data: dataISO,
        inicio: Number(inicioMin),
        fim: Number(fimMin),
        chromebooks: chromebookIds,
        turma,
        classe: classeObrigatoria ? classe : '',
        observacoes: observacoes.trim(),
        status: 'ativo',
        status_entrega: 'pendente',
      })

      router.push('/agendamentos/meus')
    } catch (err: unknown) {
      const erro = err as { data?: { message?: string }; message?: string }
      console.error(err)
      alert(
        erro?.data?.message ||
          erro?.message ||
          JSON.stringify(erro?.data) ||
          'Erro ao salvar',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-3xl mx-auto py-16">
        <BackButton href="/agendamentos/novo" />
        <h1 className="text-3xl font-bold mb-10 text-center">Novo agendamento</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-2xl p-8 space-y-6">
          <div className="text-sm text-gray-600">
            {Number.isFinite(minutosAte(data, inicio)) ? (
              <>
                Limite atual: <b>{limite === 999 ? 'sem limite' : limite}</b> chromebooks{' '}
                {limite === 5 ? '(faltando menos de 1h)' : '(com 1h ou mais)'}
              </>
            ) : (
              <>Escolha data e horário de início para calcular o limite.</>
            )}
          </div>

          <div>
            <label className="block font-medium mb-2">Data</label>
            <input
              type="date"
              className="w-full border rounded-lg px-4 py-2"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Início</label>
              <input
                type="time"
                className="w-full border rounded-lg px-4 py-2"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Fim</label>
              <input
                type="time"
                className="w-full border rounded-lg px-4 py-2"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-4">
              Escolha os Chromebooks ({chromebookIds.length}
              {limite !== 999 ? ` / ${limite}` : ''})
            </label>

            {verificandoDisponibilidade && (
              <div className="text-sm text-gray-500 mb-3">
                Verificando disponibilidade no horário...
              </div>
            )}

            {carregandoChromes ? (
              <div className="text-gray-500">Carregando chromebooks...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {chromebooks.map((c) => {
                  const ativo = chromebookIds.includes(c.id)
                  const disponivel = chromeDisponivel(c)
                  const ocupadoNoHorario = chromeOcupadoNoHorario(c)

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChromebook(c.id)}
                      disabled={!disponivel || verificandoDisponibilidade}
                      className={`border rounded-xl p-4 text-left transition shadow-sm ${
                        ativo
                          ? 'border-blue-500 bg-blue-50'
                          : disponivel
                            ? 'hover:border-gray-400'
                            : 'opacity-55 bg-gray-100 border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💻</span>

                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">
                            {c.codigo || 'Sem código'}
                          </p>

                          <p
                            className={`text-xs ${
                              !disponivel ? 'text-red-600 font-medium' : 'text-gray-600'
                            }`}
                          >
                            {ocupadoNoHorario
                              ? 'ocupado nesse horário'
                              : c.status || 'disponivel'}
                          </p>

                          {ativo && (
                            <p className="text-xs font-semibold text-blue-600 mt-1">
                              Selecionado
                            </p>
                          )}

                          {!disponivel && (
                            <p className="text-xs font-semibold text-red-600 mt-1">
                              {ocupadoNoHorario
                                ? 'Já reservado nesse horário'
                                : 'Bloqueado para agendamento'}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selecionados.length > 0 && (
              <div className="mt-3 text-sm text-gray-700">
                Selecionados: <b>{selecionados.map((s) => s.codigo).join(', ')}</b>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Turma / Série</label>
              <select
                className="w-full border rounded-lg px-4 py-2 bg-white"
                value={turma}
                onChange={(e) => handleTurmaChange(e.target.value)}
                required
              >
                <option value="">Selecione a turma</option>
                {Object.keys(TURMAS_CONFIG).map((nomeTurma) => (
                  <option key={nomeTurma} value={nomeTurma}>
                    {nomeTurma}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-2">Classe</label>
              <select
                className="w-full border rounded-lg px-4 py-2 bg-white"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
                disabled={!turma || opcoesClasse.length === 0}
                required={classeObrigatoria}
              >
                <option value="">
                  {!turma
                    ? 'Escolha a turma primeiro'
                    : opcoesClasse.length === 0
                      ? 'Não precisa selecionar classe'
                      : 'Selecione a classe'}
                </option>
                {opcoesClasse.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Observações</label>
            <textarea
              className="w-full border rounded-lg px-4 py-3 min-h-[110px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Escreva aqui alguma observação importante sobre o agendamento..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || verificandoDisponibilidade || carregandoChromes}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading
              ? 'Salvando...'
              : verificandoDisponibilidade
                ? 'Verificando disponibilidade...'
                : 'Salvar agendamento'}
          </button>
        </form>
      </div>
    </>
  )
}