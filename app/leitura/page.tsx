'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { pb } from '@/lib/pocketbase'
import HeaderDashboard from '@/components/HeaderDashboard'

export default function LeituraQRCode() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [mensagem, setMensagem] = useState('')
  const [lendo, setLendo] = useState(true)

  useEffect(() => {
    if (!lendo) return

    scannerRef.current = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: 250,
      },
      false
    )

    scannerRef.current.render(
      async (texto) => {
        setLendo(false)

        try {
          // busca chromebook pelo código
          const chromebook = await pb
            .collection('chromebooks')
            .getFirstListItem(`codigo="${texto}"`)

          // horário atual
          const agora = new Date()
          const data = agora.toISOString().split('T')[0]
          const minutos = agora.getHours() * 60 + agora.getMinutes()

          // busca agendamento ativo
          const agendamento = await pb
            .collection('agendamentos')
            .getFirstListItem(
              `data="${data}" && inicio <= ${minutos} && fim >= ${minutos}`
            )

          await pb.collection('emprestimos').create({
            chromebook: chromebook.id,
            agendamento: agendamento.id,
            usuario: pb.authStore.model?.id,
          })

          setMensagem('✅ Leitura registrada com sucesso')
        } catch (err: any) {
          setMensagem(err?.data?.message || '❌ Erro na leitura')
        }

        scannerRef.current?.clear()
      },
      () => {}
    )

    return () => {
      scannerRef.current?.clear()
    }
  }, [lendo])

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <h1 className="text-2xl font-bold">
          Leitura de QR Code
        </h1>

        {lendo && (
          <div
            id="reader"
            className="rounded-xl overflow-hidden"
          />
        )}

        {mensagem && (
          <p className="font-semibold text-lg">
            {mensagem}
          </p>
        )}

        {!lendo && (
          <button
            onClick={() => {
              setMensagem('')
              setLendo(true)
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Nova leitura
          </button>
        )}
      </div>
    </>
  )
}
