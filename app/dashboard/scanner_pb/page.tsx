// ❗ Versão PocketBase (em pausa)

'use client'


import { useEffect, useState, useRef } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import HeaderDashboard from '@/components/HeaderDashboard'
import { pb } from '@/lib/pocketbase'

type Agendamento = {
  id: string
  carrinho: number
  data: string
  inicio: number
  fim: number
}

type Chromebook = {
  id: string
  codigo: string
  carrinho: number
}

type Emprestimo = {
  id: string
  status: string
  created: string
  entrada_em: string
  expand?: {
    chromebook?: Chromebook
  }
}

function agoraEmMinutos() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function podeLerQRCode(a: Agendamento) {
  const hoje = new Date().toISOString().split('T')[0]
  if (a.data !== hoje) return false
  const agora = agoraEmMinutos()
  return agora >= a.inicio - 10 && agora <= a.fim
}

export default function ScannerPage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null)
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([])
  const [mensagem, setMensagem] = useState<string | null>(null)

  const bloqueadoRef = useRef(false)
  const ultimoCodigoRef = useRef('')
  const ultimoTempoRef = useRef(0)

  async function carregarEmprestimos(agendamentoId: string) {
    console.log('🔄 Carregando empréstimos do agendamento:', agendamentoId)
    try {
      // Teste 1: SEM FILTRO NENHUM
      const semFiltro = await pb
        .collection('emprestimos')
        .getFullList<Emprestimo>({
          expand: 'chromebook',
          sort: '-created',
        })
      console.log('📊 TODOS empréstimos (sem filtro):', semFiltro)
      
      // Teste 2: Filtro só agendamento
      const comAgendamento = await pb
        .collection('emprestimos')
        .getFullList<Emprestimo>({
          filter: `agendamento = "${agendamentoId}"`,
          expand: 'chromebook',
          sort: '-created',
        })
      console.log('📊 Empréstimos deste agendamento:', comAgendamento)
      
      // Teste 3: Filtro completo
      const lista = await pb
        .collection('emprestimos')
        .getFullList<Emprestimo>({
          filter: `agendamento = "${agendamentoId}" && status = "em_uso"`,
          expand: 'chromebook',
          sort: '-created',
        })
      console.log('✅ Empréstimos EM USO:', lista)
      setEmprestimos(lista)
    } catch (err) {
      console.error('❌ Erro ao carregar empréstimos:', err)
      setEmprestimos([])
    }
  }

  function toast(texto: string) {
    console.log('📢 Toast:', texto)
    setMensagem(texto)
    setTimeout(() => setMensagem(null), 3000)
  }

  useEffect(() => {
    async function buscarAgendamento() {
      try {
        const user = pb.authStore.model
        if (!user) {
          setErro('Usuário não autenticado.')
          return
        }

        const hoje = new Date().toISOString().split('T')[0]
        const ags = await pb.collection('agendamentos').getFullList<Agendamento>({
          filter: `usuario = "${user.id}" && data = "${hoje}"`,
          sort: 'inicio',
        })

        const agora = agoraEmMinutos()
        const ativo = ags.find(
          (a) => agora >= a.inicio - 10 && agora <= a.fim
        )

        if (!ativo) {
          setErro('Você não possui agendamento ativo neste horário.')
          return
        }

        console.log('✅ Agendamento ativo:', ativo)
        setAgendamento(ativo)
        await carregarEmprestimos(ativo.id)
      } catch (e) {
        console.error(e)
        setErro('Erro ao buscar agendamento.')
      } finally {
        setLoading(false)
      }
    }

    buscarAgendamento()
  }, [])

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">
          📷 Scanner de QR Code
        </h1>

        {loading && <p className="text-center">Carregando...</p>}

        {erro && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
            {erro}
          </div>
        )}

        {/* Toast de notificação */}
        {mensagem && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
            {mensagem}
          </div>
        )}

        {agendamento && podeLerQRCode(agendamento) && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-center text-blue-800">
                Carrinho agendado: <strong className="text-xl">#{agendamento.carrinho}</strong>
              </p>
            </div>

            {/* Scanner */}
            <div className="mb-6 rounded-xl overflow-hidden border-4 border-gray-300">
              <Scanner
                constraints={{ facingMode: 'environment' }}
                onScan={async (results) => {
                  if (!results?.length) return

                  const user = pb.authStore.model
                  if (!user) {
                    toast('❌ Usuário não autenticado')
                    return
                  }

                  if (!agendamento) return

                  if (bloqueadoRef.current) {
                    console.log('🔒 Scanner bloqueado')
                    return
                  }

                  const agora = Date.now()
                  const codigoQR = results[0].rawValue
                  console.log('📷 QR Code lido:', codigoQR)

                  // Evitar leitura duplicada
                  if (
                    ultimoCodigoRef.current === codigoQR &&
                    agora - ultimoTempoRef.current < 4000
                  ) {
                    console.log('⏭️ Ignorando leitura duplicada')
                    return
                  }

                  bloqueadoRef.current = true

                  try {
                    // 1️⃣ Buscar chromebook
                    console.log('🔍 Buscando chromebook...')
                    const chromes = await pb
                      .collection('chromebooks')
                      .getFullList<Chromebook>({
                        filter: `codigo = "${codigoQR}"`,
                      })

                    if (chromes.length === 0) {
                      toast('❌ Chromebook não encontrado')
                      return
                    }

                    const chromebook = chromes[0]
                    console.log('✅ Chromebook encontrado:', chromebook)

                    // Verificar se é do carrinho correto
                    if (chromebook.carrinho !== agendamento.carrinho) {
                      toast(`⚠️ Chromebook do Carrinho ${chromebook.carrinho}`)
                      return
                    }

                    // 2️⃣ Verificar se JÁ ESTÁ EM USO
                    console.log('🔍 Verificando status...')
                    const ativos = await pb
                      .collection('emprestimos')
                      .getFullList({
                        filter: `agendamento = "${agendamento.id}" && chromebook = "${chromebook.id}" && status = "em_uso"`,
                      })

                    console.log('📊 Empréstimos ativos encontrados:', ativos.length)

                    if (ativos.length > 0) {
                      // 🔄 DEVOLVER
                      console.log('🔄 Devolvendo chromebook...')
                      await pb.collection('emprestimos').update(ativos[0].id, {
                        status: 'devolvido',
                        saida_em: new Date().toISOString(),
                      })
                      console.log('✅ Chromebook devolvido')
                      toast(`✅ ${codigoQR} DEVOLVIDO`)
                    } else {
                      // 📦 RETIRAR
                      console.log('📦 Criando novo empréstimo...')
                      console.log('👤 User ID:', user.id)
                      console.log('📦 Agendamento ID:', agendamento.id)
                      console.log('💻 Chromebook ID:', chromebook.id)

                      const novoEmprestimo = await pb.collection('emprestimos').create({
                        agendamento: agendamento.id,
                        chromebook: chromebook.id,
                        usuario: user.id,
                        status: 'em_uso',
                        entrada_em: new Date().toISOString(),
                      })

                      console.log('✅ Empréstimo criado:', novoEmprestimo)
                      console.log('📋 ID criado:', novoEmprestimo.id)
                      console.log('📊 Status salvo:', novoEmprestimo.status)
                      console.log('👤 Usuario salvo:', novoEmprestimo.usuario)
                      console.log('📅 Agendamento salvo:', novoEmprestimo.agendamento)
                      console.log('💻 Chromebook salvo:', novoEmprestimo.chromebook)

                      // VERIFICAR SE FOI SALVO MESMO
                      try {
                        const verificar = await pb.collection('emprestimos').getOne(novoEmprestimo.id)
                        console.log('🔍 VERIFICAÇÃO - Empréstimo existe no banco:', verificar)
                      } catch (e) {
                        console.error('❌ ERRO - Empréstimo NÃO foi salvo!', e)
                      }

                      toast(`✅ ${codigoQR} RETIRADO`)
                    }

                    // 🔄 AGUARDAR E RECARREGAR
                    console.log('⏳ Aguardando 500ms...')
                    await new Promise(resolve => setTimeout(resolve, 500))
                    
                    console.log('🔄 Recarregando lista...')
                    await carregarEmprestimos(agendamento.id)

                    ultimoCodigoRef.current = codigoQR
                    ultimoTempoRef.current = Date.now()

                  } catch (e: any) {
                    console.error('❌ Erro detalhado:', e)
                    console.error('❌ Mensagem:', e?.message)
                    console.error('❌ Response:', e?.response)
                    toast(`❌ Erro: ${e?.message || 'Desconhecido'}`)
                  } finally {
                    setTimeout(() => {
                      bloqueadoRef.current = false
                      console.log('🔓 Scanner liberado')
                    }, 2000)
                  }
                }}
                onError={(error: any) => {
                  console.error('❌ Erro do scanner:', error)
                  if (error?.name === 'NotAllowedError') {
                    toast('⚠️ Permita o acesso à câmera')
                  }
                }}
              />
            </div>

            {/* Lista */}
            <div className="mt-6">
              <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                <span>📦</span>
                Chromebooks em uso ({emprestimos.length})
              </h2>

              {emprestimos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <p className="text-gray-500">Nenhum chromebook em uso</p>
                  <p className="text-xs text-gray-400 mt-2">Escaneie um QR Code para começar</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {emprestimos.map((e) => (
                    <li
                      key={e.id}
                      className="flex justify-between items-center bg-red-50 border-2 border-red-300 p-4 rounded-lg shadow-sm"
                    >
                      <div>
                        <span className="font-bold text-lg block">
                          {e.expand?.chromebook?.codigo || 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(e.entrada_em || e.created).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <span className="text-sm font-bold px-4 py-2 rounded-full bg-red-600 text-white">
                        🔴 EM USO
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

