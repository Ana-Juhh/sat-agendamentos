import { NextResponse } from 'next/server'
import { GRADE_MAKER_FIXA, parseGradeMakerCSV } from '@/lib/gradeMaker'

// Fora do prefixo /api de proposito -- na VPS, /api/* e roteado pro
// PocketBase antes de chegar no Next.js (ver app/grade-fixa-semanal/route.ts
// pro mesmo problema/solucao ja aplicado na grade dos carrinhos).
export const revalidate = 60

export async function GET() {
  const url = process.env.GRADE_MAKER_SHEET_CSV_URL

  if (!url) {
    return NextResponse.json({
      linhas: GRADE_MAKER_FIXA,
      fonte: 'padrao',
      erros: ['GRADE_MAKER_SHEET_CSV_URL não configurada — usando a grade fixa do código.'],
      atualizadoEm: null,
    })
  }

  try {
    const resposta = await fetch(url, { next: { revalidate: 60 } })
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status)

    const texto = await resposta.text()
    const { linhas, erros } = parseGradeMakerCSV(texto)

    if (linhas.length === 0) {
      throw new Error('Planilha sem linhas válidas (' + erros.join('; ') + ')')
    }

    return NextResponse.json({
      linhas,
      fonte: 'planilha',
      erros,
      atualizadoEm: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Erro ao buscar grade da Sala Maker:', err)
    return NextResponse.json({
      linhas: GRADE_MAKER_FIXA,
      fonte: 'padrao',
      erros: ['Não foi possível carregar a planilha — usando a última grade fixa conhecida.'],
      atualizadoEm: null,
    })
  }
}
