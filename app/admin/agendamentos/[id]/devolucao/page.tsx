'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { canViewAllAgendamentos } from '@/lib/roles'
import BackButton from "@/components/BackButton";
<BackButton href="/dashboard" />
type Chromebook = {
  id: string
  codigo?: string
  status?: string
}

type Usuario = {
  id: string
  name?: string
  email?: string
  role?: string
}

type Agendamento = {
  id: string
  usuario: string
  chromebooks: string[]
  chromebooks_devolvidos?: string[]
  data: string
  inicio: number
  fim: number
  status: 'ativo' | 'cancelado'
  status_entrega?: 'pendente' | 'em_uso' | 'devolvido' | 'atrasado'
  turma?: string
  classe?: string
  observacoes?: string
  expand?: {
    usuario?: Usuario
    chromebooks?: Chromebook[]
    chromebooks_devolvidos?: Chromebook[]
  }
}

type PocketBaseError = {
  data?: {
    message?: string
  }
  message?: string
}

function normalizarDataISO(v: string) {
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  return v.slice(0, 10)
}

function formatarDataBR(dataISO: string) {
  const iso = normalizarDataISO(dataISO)
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export default function DevolucaoAgendamentoPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [authReady, setAuthReady] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [devolvidosSelecionados, setDevolvidosSelecionados] = useState<string[]>([])

  useEffect(() => {
    const model = pb.authStore.model as { role?: string } | null
    setRole(model?.role ?? null)
    setAuthReady(true)
  }, [])

  useEffect(() => {
    if (!authReady) return

    if (!pb.authStore.isValid) {
      router.push('/login')
      return
    }

    if (!canViewAllAgendamentos(role)) {
      router.push('/dashboard')
      return
    }

    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, role, id])

  async function carregar() {
    if (!id) return

    try {
      setCarregando(true)

      const registro = await pb.collection(AG_COLLECTION).getOne<Agendamento>(id, {
        expand: 'usuario,chromebooks,chromebooks_devolvidos',
      })

      setAgendamento(registro)

      const devolvidosIds =
        registro.expand?.chromebooks_devolvidos?.map((c) => c.id) ??
        registro.chromebooks_devolvidos ??
        []

      setDevolvidosSelecionados(devolvidosIds)
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar devolucao')
      router.push('/admin')
    } finally {
      setCarregando(false)
    }
  }

  const chromesReservados = useMemo(() => {
    return agendamento?.expand?.chromebooks ?? []
  }, [agendamento])

  const nomeUsuario = useMemo(() => {
    if (!agendamento) return '-'
    return (
      agendamento.expand?.usuario?.name ||
      agendamento.expand?.usuario?.email ||
      'Usuario sem nome'
    )
  }, [agendamento])

  function toggleDevolvido(chromeId: string) {
    setDevolvidosSelecionados((prev) => {
      if (prev.includes(chromeId)) {
        return prev.filter((itemId) => itemId !== chromeId)
      }
      return [...prev, chromeId]
    })
  }

  async function salvarDevolucao() {
    if (!agendamento) return

    setSalvando(true)
    try {
      const total = agendamento.chromebooks.length
      const devolvidos = devolvidosSelecionados.length

      let statusEntrega: 'pendente' | 'em_uso' | 'devolvido' | 'atrasado' = 'pendente'

      if (devolvidos === 0) {
        statusEntrega = 'em_uso'
      } else if (devolvidos < total) {
        statusEntrega = 'em_uso'
      } else {
        statusEntrega = 'devolvido'
      }

      await pb.collection(AG_COLLECTION).update(agendamento.id, {
        chromebooks_devolvidos: devolvidosSelecionados,
        status_entrega: statusEntrega,
      })

      alert('Devolucao atualizada')
      router.push('/admin')
    } catch (e: unknown) {
      const erro = e as PocketBaseError
      console.error(e)
      alert(erro?.data?.message || erro?.message || 'Erro ao salvar devolucao')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Devolucao de Chromebooks</h1>

          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 rounded-xl border hover:bg-gray-50 transition"
          >
            Voltar
          </button>
        </div>

        {carregando || !agendamento ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <b>Professor(a):</b> {nomeUsuario}
              </div>
              <div>
                <b>Data:</b> {formatarDataBR(agendamento.data)}
              </div>
              <div>
                <b>Turma:</b>{' '}
                {agendamento.turma
                  ? `${agendamento.turma}${agendamento.classe ? ` ${agendamento.classe}` : ''}`
                  : '-'}
              </div>
              {agendamento.observacoes && (
                <div>
                  <b>Observacoes:</b> {agendamento.observacoes}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-3">
                Marque os chromebooks que ja foram devolvidos
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {chromesReservados.map((chromebook) => {
                  const marcado = devolvidosSelecionados.includes(chromebook.id)

                  return (
                    <button
                      key={chromebook.id}
                      type="button"
                      onClick={() => toggleDevolvido(chromebook.id)}
                      className={`border rounded-xl p-4 text-left transition ${
                        marcado
                          ? 'border-green-500 bg-green-50'
                          : 'hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{chromebook.codigo || chromebook.id}</p>
                          <p className="text-sm text-gray-500">
                            {marcado ? 'Marcado como devolvido' : 'Ainda nao devolvido'}
                          </p>
                        </div>

                        <div className="text-2xl">
                          {marcado ? 'OK' : '[]'}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
              <p>
                <b>Total reservados:</b> {agendamento.chromebooks.length}
              </p>
              <p>
                <b>Devolvidos agora:</b> {devolvidosSelecionados.length}
              </p>
              <p>
                <b>Pendentes:</b>{' '}
                {agendamento.chromebooks.length - devolvidosSelecionados.length}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => router.push('/admin')}
                className="px-5 py-3 rounded-xl border hover:bg-gray-50 transition"
              >
                Cancelar
              </button>

              <button
                onClick={salvarDevolucao}
                disabled={salvando}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar devolucao'}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
