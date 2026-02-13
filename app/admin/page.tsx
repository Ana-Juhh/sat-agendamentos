'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'


function minutosParaHora(minutos: number) {
    const h = Math.floor(minutos / 60)
    const m = minutos % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatarData(data: string) {
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
}

export default function AdminPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [agendamentos, setAgendamentos] = useState<any[]>([])

    useEffect(() => {
        if (!pb.authStore.isValid) {
            router.replace('/login')
            return
        }

        if (!pb.authStore.model?.isAdmin) {
            router.replace('/dashboard')
            return
        }

        carregar()
    }, [])

    async function carregar() {
        const dados = await pb.collection('agendamentos').getFullList({
            expand: 'usuario',
            sort: 'data,inicio',
        })
        setAgendamentos(dados)
        setLoading(false)
    }

    async function excluir(id: string) {
        if (!confirm('Tem certeza que deseja excluir?')) return

        try {
            await pb.collection('agendamentos').delete(id)
            setAgendamentos((prev) => prev.filter((a) => a.id !== id))
        } catch (err) {
            alert('Erro ao excluir')
        }
    }

    if (loading) {
        return null // ou um loader se quiser
    }


    return (
        <>
            <HeaderDashboard />

            <div className="max-w-6xl mx-auto py-16">
                <h1 className="text-3xl font-bold mb-8 text-center">
                    Agenda geral (Admin)
                </h1>

                <div className="space-y-10">
                    {Object.entries(
                        agendamentos.reduce((acc: any, ag: any) => {
                            acc[ag.data] = acc[ag.data] || []
                            acc[ag.data].push(ag)
                            return acc
                        }, {})
                    ).map(([data, itens]: any) => (
                        <div key={data}>
                            <h2 className="text-xl font-bold mb-4">
                                📅 {formatarData(data)}
                            </h2>

                            <div className="space-y-3">
                                {itens.map((a: any) => (
                                    <div
                                        key={a.id}
                                        className="bg-white shadow rounded-xl p-5 flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                🛒 Carrinho {a.carrinho}
                                            </p>

                                            <p className="text-sm text-gray-600">
                                                {minutosParaHora(a.inicio)} – {minutosParaHora(a.fim)}
                                            </p>

                                            <p className="text-sm text-gray-500">
                                                Professor:{' '}
                                                {a.expand?.usuario?.name ||
                                                    a.expand?.usuario?.email}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => excluir(a.id)}
                                            className="text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Excluir
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {agendamentos.length === 0 && (
                    <p className="text-center text-gray-500">
                        Nenhum agendamento encontrado
                    </p>
                )}
            </div>
        </>
    )
}
