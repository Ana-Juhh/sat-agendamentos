'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'
import BackButton from '@/components/BackButton'

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

function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

export default function NovoAgendamentoMaker() {
  const router = useRouter()

  const [data, setData] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [turma, setTurma] = useState('')
  const [classe, setClasse] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)

  const opcoesClasse = useMemo(() => {
    return turma ? TURMAS_CONFIG[turma] || [] : []
  }, [turma])

  const classeObrigatoria = opcoesClasse.length > 0

  function handleTurmaChange(value: string) {
    setTurma(value)
    setClasse('')
  }

  async function existeConflito(params: {
    dataISO: string
    inicioMin: number
    fimMin: number
  }) {
    const { dataISO, inicioMin, fimMin } = params

    const filter =
      `tipo = "maker" && ` +
      `data="${dataISO}" && ` +
      `inicio < ${fimMin} && fim > ${inicioMin} && ` +
      `status="ativo" && ` +
      `status_entrega != "devolvido"`

    const achou = await pb
      .collection(ESPACOS_COLLECTION)
      .getFirstListItem(filter, { requestKey: null })
      .catch(() => null)

    return !!achou
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

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

    const usuarioId = (pb.authStore.model as any)?.id
    const collectionName = (pb.authStore.model as any)?.collectionName

    if (!usuarioId || collectionName !== 'users') {
      alert('Usuário não autenticado corretamente.')
      return
    }

    const dataISO = normalizarDataISO(data)
    const inicioMin = horaParaMinutos(inicio)
    const fimMin = horaParaMinutos(fim)

    if (fimMin <= inicioMin) {
      alert('Horário final deve ser maior que o inicial')
      return
    }

    setLoading(true)
    try {
      const conflito = await existeConflito({
        dataISO,
        inicioMin,
        fimMin,
      })

      if (conflito) {
        alert('A Sala Maker já está reservada nesse horário.')
        return
      }

      await pb.collection(ESPACOS_COLLECTION).create({
        usuario: String(usuarioId),
        tipo: 'maker',
        data: dataISO,
        inicio: inicioMin,
        fim: fimMin,
        turma,
        classe: classeObrigatoria ? classe : '',
        observacoes: observacoes.trim(),
        status: 'ativo',
        status_entrega: 'pendente',
      })

      router.push('/agendamentos/meus')
    } catch (err: any) {
      console.error(err)
      alert(err?.data?.message || err?.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-3xl mx-auto py-16">
        <BackButton href="/agendamentos/novo" />
        <h1 className="text-3xl font-bold mb-10 text-center">Novo agendamento — Sala Maker</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-2xl p-8 space-y-6">
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
              placeholder="Escreva aqui alguma observação importante..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar agendamento'}
          </button>
        </form>
      </div>
    </>
  )
}