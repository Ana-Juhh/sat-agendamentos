import { NextResponse } from 'next/server'
import { GRADE_SEMANAL_FIXA, parseGradeSemanalCSV } from '@/lib/gradeSemanal'

// Revalida a cada 60s (cache do Next) — a planilha nao precisa ser buscada a
// cada carregamento de pagina, mas uma edicao aparece em ate 1 minuto.
export const revalidate = 60

export async function GET() {
  const url = process.env.GRADE_SEMANAL_SHEET_CSV_URL

  if (!url) {
    return NextResponse.json({
      linhas: GRADE_SEMANAL_FIXA,
      fonte: 'padrao',
      erros: ['GRADE_SEMANAL_SHEET_CSV_URL não configurada — usando a grade fixa do código.'],
      atualizadoEm: null,
    })
  }

  try {
    const resposta = await fetch(url, { next: { revalidate: 60 } })
    if (!resposta.ok) throw new Error('HTTP ' + resposta.status)

    const texto = await resposta.text()
    const { linhas, erros } = parseGradeSemanalCSV(texto)

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
    console.error('Erro ao buscar grade semanal da planilha:', err)
    return NextResponse.json({
      linhas: GRADE_SEMANAL_FIXA,
      fonte: 'padrao',
      erros: ['Não foi possível carregar a planilha — usando a última grade fixa conhecida.'],
      atualizadoEm: null,
    })
  }
}
