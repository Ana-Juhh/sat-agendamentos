'use client'

import { Scanner } from '@yudiel/react-qr-scanner'
import { useRef, useState } from 'react'
import HeaderDashboard from '@/components/HeaderDashboard'

export default function ScannerSheetPage() {
  const bloqueadoRef = useRef(false)
  const ultimoCodigoRef = useRef('')
  const ultimoTempoRef = useRef(0)

  const [mensagem, setMensagem] = useState<string | null>(null)

  function toast(texto: string) {
    setMensagem(texto)
    setTimeout(() => setMensagem(null), 3000)
  }

  // 🔧 CONFIGURAÇÃO DO AGENDAMENTO (AJUSTE AQUI)
  const carrinho = 1
  const inicio = 780 // 13:00
  const fim = 880    // 14:40

  async function enviarParaPlanilha(qr: string) {
    const res = await fetch(
      'https://script.google.com/macros/s/AKfycbwvvsULJCyjZKAKfPhToSMpLYC1gKFijnDAAxBRMp8PFduNCS7MW0hi7b7VowwSZQNZog/exec',
      {
        method: 'POST',
        body: JSON.stringify({
          qr,
          carrinho,
          inicio,
          fim,
          usuario: 'Ana',
        }),
      }
    )

    const data = await res.json()

    if (data.erro) {
      throw new Error(data.erro)
    }

    return data.resultado // retirado | devolvido
  }

  return (
    <>
      <HeaderDashboard />

      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4 text-center">
          📷 Leitura de QR Code
        </h1>

        {mensagem && (
          <div className="mb-4 bg-green-600 text-white px-4 py-2 rounded text-center">
            {mensagem}
          </div>
        )}

        <Scanner
          constraints={{ facingMode: 'environment' }}
          onScan={async (results) => {
            if (!results?.length) return
            if (bloqueadoRef.current) return

            const agora = Date.now()
            const codigoQR = results[0].rawValue

            // ⏱️ Evita leitura duplicada
            if (
              ultimoCodigoRef.current === codigoQR &&
              agora - ultimoTempoRef.current < 4000
            ) {
              return
            }

            bloqueadoRef.current = true

            try {
              const resultado = String(await enviarParaPlanilha(codigoQR))
                .trim()
                .toLowerCase()

              if (resultado === 'retirado') {
                toast(`📦 ${codigoQR} RETIRADO`)
              } else if (resultado === 'devolvido') {
                toast(`🔄 ${codigoQR} DEVOLVIDO`)
              } else {
                toast(`ℹ️ ${codigoQR} registrado`)
              }


              ultimoCodigoRef.current = codigoQR
              ultimoTempoRef.current = Date.now()
            } catch (e: any) {
              console.error(e)
              toast(e.message || 'Erro ao enviar para a planilha')
            } finally {
              setTimeout(() => {
                bloqueadoRef.current = false
              }, 2000)
            }
          }}
        />
      </div>
    </>
  )
}
