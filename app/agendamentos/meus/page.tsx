'use client'

import { useEffect, useMemo, useState } from 'react'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'
import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { useRouter } from 'next/navigation'

type Chromebook = {
  id: string
  codigo?: string
  status?: string
}

type User = {
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
  expand?: {
    chromebooks?: Chromebook[]
    usuario?: User
  }
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

export default function MeusAgendamentos() {
  const router = useRouter()

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [carregando, setCarregando] = useState(true)

  // ✅ evita hydration mismatch: começamos "neutro"
  const [authReady, setAuthReady] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'professor' | null>(null)

  // 1) pega auth SÓ no client
  useEffect(() => {
    const model: any = pb.authStore.model
    setUsuarioId(model?.id ?? null)
    setRole((model?.role as any) ?? null)
    setAuthReady(true)
  }, [])

  async function carregar() {
    try {
      setCarregando(true)

      if (!pb.authStore.isValid || !usuarioId) {
        setAgendamentos([])
        return
      }

      const filter =
        role === 'admin'
          ? `status = "ativo"`
          : `usuario = "${usuarioId}" && status = "ativo"`

      const dados = await pb.collection(AG_COLLECTION).getFullList<Agendamento>({
        filter,
        sort: 'data,inicio',
        expand: 'chromebooks,usuario',
      })

      setAgendamentos(dados)
    } catch (e) {
      console.error(e)
      alert('Erro ao carregar agendamentos')
    } finally {
      setCarregando(false)
    }
  }

  // 2) só carrega quando auth estiver pronto
  useEffect(() => {
    if (!authReady) return
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, usuarioId, role])

  const agendamentosPorData = useMemo(() => {
    return agendamentos.reduce((acc: Record<string, Agendamento[]>, ag) => {
      const chave = normalizarDataISO(ag.data)
      acc[chave] = acc[chave] || []
      acc[chave].push(ag)
      return acc
    }, {})
  }, [agendamentos])

  async function cancelarAgendamento(id: string) {
    if (!confirm('Cancelar este agendamento?')) return

    try {
      await pb.collection(AG_COLLECTION).update(id, { status: 'cancelado' })
      setAgendamentos((prev) => prev.filter((a) => a.id !== id))
    } catch (e) {
      console.error(e)
      alert('Erro ao cancelar. Veja o console (F12).')
    }
  }

  function editarAgendamento(id: string) {
    router.push(`/admin/agendamentos/${id}`)
  }

  return (
    <>
      <HeaderDashboard />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* ✅ só renderiza o título depois do authReady (pra não dar mismatch) */}
        <h1 className="text-3xl font-bold mb-8 text-center">
          {!authReady
            ? 'Carregando...'
            : role === 'admin'
              ? 'Agendamentos (Admin)'
              : 'Meus Agendamentos'}
        </h1>

        {carregando ? (
          <div className="text-center py-20 text-gray-500">Carregando...</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <p className="text-6xl mb-4">📅</p>
            <p className="text-gray-500 text-lg">Nenhum agendamento ativo encontrado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(agendamentosPorData).map(([dataISO, itens]) => (
              <div key={dataISO} className="bg-white rounded-2xl shadow-sm p-6">
                <h2 className="text-lg font-bold mb-4 text-gray-700">
                  📅 {formatarDataBR(dataISO)}
                </h2>

                <div className="space-y-3">
                  {itens.map((a) => {
                    const chromes = a.expand?.chromebooks ?? []
                    const listaCodigos =
                      chromes.length > 0
                        ? chromes.map((c) => c.codigo ?? c.id).join(', ')
                        : (a.chromebooks ?? []).join(', ')

                    const dono = a.expand?.usuario
                    const donoTxt =
                      role === 'admin'
                        ? `👤 ${dono?.name || dono?.email || a.usuario}`
                        : ''

                    return (
                      <div
                        key={a.id}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition"
                      >
                        <div className="min-w-0">
                          {role === 'admin' && (
                            <p className="text-xs text-gray-500 mb-1 truncate">{donoTxt}</p>
                          )}

                          <p className="font-semibold text-gray-900">
                            💻 {chromes.length || (a.chromebooks?.length ?? 0)} Chromebook(s)
                          </p>

                          <p className="text-sm text-gray-700 mt-1 truncate">
                            {listaCodigos}
                          </p>

                          <p className="text-sm text-gray-600 mt-1">
                            ⏰ {minutosParaHora(a.inicio)} – {minutosParaHora(a.fim)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {role === 'admin' && (
                            <button
                              onClick={() => editarAgendamento(a.id)}
                              className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition"
                            >
                              Editar
                            </button>
                          )}

                          <button
                            onClick={() => cancelarAgendamento(a.id)}
                            className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}