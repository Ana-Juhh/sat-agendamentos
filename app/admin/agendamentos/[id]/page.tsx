'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'

type Chromebook = {
  id: string
  codigo?: string
  status?: string
}

type Usuario = {
  id: string
  name?: string
  email?: string
  role?: 'admin' | 'professor'
}

type Agendamento = {
  id: string
  usuario: string
  chromebooks: string[]
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  turma?: string
  classe?: string
  observacoes?: string
  expand?: {
    usuario?: Usuario
    chromebooks?: Chromebook[]
  }
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
  'Bilíngue': ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y8', 'Y9', 'K2', 'K3', 'Hs2', 'Hs3'],
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

export default function EditarAgendamentoAdmin() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [ag, setAg] = useState<Agendamento | null>(null)
  const [todosChromes, setTodosChromes] = useState<Chromebook[]>([])

  const [dataISO, setDataISO] = useState('')
  const [inicioTxt, setInicioTxt] = useState('')
  const [fimTxt, setFimTxt] = useState('')
  const [selecionados, setSelecionados] = useState<string[]>([])

  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    const model: any = pb.authStore.model
    setRole(model?.role ?? null)
    setAuthReady(true)
  }, [])

  useEffect(() => {
    if (!authReady) return

    if (!pb.authStore.isValid) {
      router.push('/login')
      return
    }

    if (role !== 'admin') {
      router.push('/agendamentos/meus')
      return
    }
  }, [authReady, role, router])

  async function carregarTudo() {
    if (!id) return

    try {
      setCarregando(true)

      const [registro, chromes] = await Promise.all([
        pb.collection(AG_COLLECTION).getOne<Agendamento>(id, {
          expand: 'usuario,chromebooks',
        }),
        pb.collection('chromebooks').getFullList<Chromebook>({
          sort: 'codigo',
        }),
      ])

      setAg(registro)
      setTodosChromes(chromes)

      setDataISO(normalizarDataISO(registro.data))
      setInicioTxt(minutosParaHora(registro.inicio))
      setFimTxt(minutosParaHora(registro.fim))

      const ids =
        registro.expand?.chromebooks?.map((c) => c.id) ??
        (registro.chromebooks ?? [])

      setSelecionados(ids)
      setTurma(registro.turma || '')
      setClasse(registro.classe || '')
      setObservacoes(registro.observacoes || '')
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar agendamento')
      router.push('/agendamentos/meus')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (!authReady) return
    if (role !== 'admin') return
    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, role, id])


  const opcoesClasse = turma ? TURMAS_CONFIG[turma] || [] : []
  const classeObrigatoria = opcoesClasse.length > 0

  function toggleChrome(chromeId: string) {
    setSelecionados((prev) => {
      if (prev.includes(chromeId)) return prev.filter((x) => x !== chromeId)
      return [...prev, chromeId]
    })
  }

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  async function salvar() {
    if (!ag) return

    if (!dataISO) {
      alert('Escolha a data')
      return
    }

    if (!inicioTxt || !fimTxt) {
      alert('Preencha início e fim')
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

    const inicioMin = horaParaMinutos(inicioTxt)
    const fimMin = horaParaMinutos(fimTxt)

    if (fimMin <= inicioMin) {
      alert('Horário final deve ser maior que o inicial')
      return
    }

    if (selecionados.length === 0) {
      alert('Selecione pelo menos 1 Chromebook')
      return
    }

    setSalvando(true)
    try {
      const payload = {
        data: dataISO,
        inicio: inicioMin,
        fim: fimMin,
        chromebooks: selecionados,
        turma,
        classe: classeObrigatoria ? classe : '',
        observacoes: observacoes.trim(),
      }

      console.log('UPDATE PAYLOAD:', payload)
      await pb.collection(AG_COLLECTION).update(ag.id, payload)

      alert('Agendamento atualizado ✅')
      router.push('/agendamentos/meus')
    } catch (e: any) {
      console.error(e)
      alert(e?.data?.message || e?.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function cancelar() {
    if (!ag) return
    if (!confirm('Cancelar este agendamento?')) return

    setSalvando(true)
    try {
      await pb.collection(AG_COLLECTION).update(ag.id, { status: 'cancelado' })
      alert('Agendamento cancelado ✅')
      router.push('/agendamentos/meus')
    } catch (e: any) {
      console.error(e)
      alert(e?.data?.message || e?.message || 'Erro ao cancelar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Editar agendamento (Admin)</h1>

          <button
            onClick={() => router.push('/agendamentos/meus')}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
          >
            Voltar
          </button>
        </div>

        {carregando || !ag ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <div className="text-sm text-gray-600">
              <div>
                <b>Professor(a):</b>{' '}
                {ag.expand?.usuario?.name || ag.expand?.usuario?.email || 'Usuário sem nome'}
              </div>

              <div>
                <b>Status:</b>{' '}
                <span className={ag.status === 'ativo' ? 'text-green-700' : 'text-red-700'}>
                  {ag.status}
                </span>
              </div>

              <div>
                <b>Turma:</b>{' '}
                {ag.turma ? `${ag.turma}${ag.classe ? ` ${ag.classe}` : ''}` : '—'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-2">Data</label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-4 py-2"
                  value={dataISO}
                  onChange={(e) => setDataISO(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Início</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-4 py-2"
                  value={inicioTxt}
                  onChange={(e) => setInicioTxt(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium mb-2">Fim</label>
                <input
                  type="time"
                  className="w-full border rounded-lg px-4 py-2"
                  value={fimTxt}
                  onChange={(e) => setFimTxt(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-2">Turma / Série</label>
                <select
                  className="w-full border rounded-lg px-4 py-2 bg-white"
                  value={turma}
                  onChange={(e) => handleTurmaChange(e.target.value)}
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block font-medium">
                  Chromebooks selecionados ({selecionados.length})
                </label>

                <button
                  type="button"
                  onClick={() => setSelecionados([])}
                  className="text-sm px-3 py-2 rounded-lg border hover:bg-gray-50 transition"
                >
                  Limpar
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {todosChromes.map((c) => {
                  const ativo = selecionados.includes(c.id)

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleChrome(c.id)}
                      className={`border rounded-xl p-3 text-left transition shadow-sm ${
                        ativo ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💻</span>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">
                            {c.codigo || c.id}
                          </p>
                          {c.status ? (
                            <p className="text-xs text-gray-600">{c.status}</p>
                          ) : (
                            <p className="text-xs text-gray-400">—</p>
                          )}
                          {ativo && (
                            <p className="text-xs font-semibold text-blue-600 mt-1">
                              ✓ Selecionado
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <button
                onClick={cancelar}
                disabled={salvando}
                className="px-5 py-3 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 transition disabled:opacity-50"
              >
                Cancelar agendamento
              </button>

              <button
                onClick={salvar}
                disabled={salvando}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}