import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import nodemailer from 'nodemailer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

import { AG_COLLECTION } from '@/lib/agendamentoConfig'
import { ESPACOS_COLLECTION } from '@/lib/espacoConfig'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Registro = Record<string, any>
type RelatorioAgendamento = Registro & {
  origem_relatorio: 'chromebooks' | 'espaco'
}

type ChecagensDoMes = {
  relatorios: Registro[]
  itensPorRelatorio: Record<string, Registro[]>
}

type IntervaloMes = {
  mes: string
  inicio: string
  fimExclusivo: string
  titulo: string
}

function getPocketBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_POCKETBASE_URL ||
    process.env.POCKETBASE_URL ||
    'http://127.0.0.1:8090'
  )
}

function exigirEnv(nome: string) {
  const valor = process.env[nome]

  if (!valor) {
    throw new Error(`Variável ${nome} não configurada no .env`)
  }

  return valor
}

function criarDataLocal(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

function formatarDataISO(data: Date) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function hojeEmSaoPaulo() {
  const partes = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const dia = partes.find((p) => p.type === 'day')?.value || ''
  const mes = partes.find((p) => p.type === 'month')?.value || ''
  const ano = partes.find((p) => p.type === 'year')?.value || ''

  return `${ano}-${mes}-${dia}`
}

function obterMesAnterior() {
  const hoje = criarDataLocal(hojeEmSaoPaulo())
  const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)

  const ano = anterior.getFullYear()
  const mes = String(anterior.getMonth() + 1).padStart(2, '0')

  return `${ano}-${mes}`
}

function obterIntervaloMes(mesParam?: string | null): IntervaloMes {
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam)
    ? mesParam
    : obterMesAnterior()

  const [ano, mesNumero] = mes.split('-').map(Number)

  const inicioDate = new Date(ano, mesNumero - 1, 1)
  const fimDate = new Date(ano, mesNumero, 1)

  const inicio = formatarDataISO(inicioDate)
  const fimExclusivo = formatarDataISO(fimDate)

  const titulo = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(inicioDate)

  return {
    mes,
    inicio,
    fimExclusivo,
    titulo,
  }
}

function formatarDataBR(dataISO: string) {
  if (!dataISO) return '-'

  const iso = dataISO.slice(0, 10)
  const [ano, mes, dia] = iso.split('-')

  if (!ano || !mes || !dia) return dataISO

  return `${dia}/${mes}/${ano}`
}

function minutosParaHora(minutos: number) {
  const h = Math.floor(Number(minutos || 0) / 60)
  const m = Number(minutos || 0) % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatarDataHoraBR(valor?: string) {
  if (!valor) return '-'

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) return valor

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

function escapar(valor: any) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function nomeUsuario(registro: Registro) {
  return (
    registro.expand?.usuario?.name ||
    registro.expand?.usuario?.nome ||
    registro.expand?.usuario?.email ||
    registro.expand?.verificadoPor?.name ||
    registro.expand?.verificadoPor?.nome ||
    registro.expand?.verificadoPor?.email ||
    registro.usuario_nome ||
    registro.responsavel_nome ||
    registro.email ||
    '-'
  )
}

function nomeCarrinho(registro: Registro) {
  return (
    registro.expand?.carrinho?.nome ||
    registro.expand?.carrinho?.codigo ||
    registro.expand?.carrinho?.name ||
    registro.carrinho_nome ||
    registro.nome_carrinho ||
    registro.carrinho ||
    '-'
  )
}

function nomeTurmaClasse(registro: Registro) {
  if (!registro.turma) return '-'
  if (!registro.classe) return registro.turma
  return `${registro.turma} ${registro.classe}`
}

function nomeStatusEntrega(status?: string) {
  if (status === 'em_uso') return 'Em uso'
  if (status === 'devolvido') return 'Devolvido'
  if (status === 'atrasado') return 'Atrasado'
  return 'Pendente'
}

function nomeRecursoAgendamento(
  registro: Registro,
  origem: 'chromebooks' | 'espaco'
) {
  if (origem === 'chromebooks') {
    const quantidade =
      registro.expand?.chromebooks?.length || registro.chromebooks?.length || 0

    return `${quantidade} Chromebook(s)`
  }

  if (registro.tipo === 'maker') return 'Sala Maker'
  if (registro.tipo === 'lab') return 'Lab. de Ciências'

  return registro.tipo || 'Espaço'
}

function codigosChromebooks(registro: Registro) {
  const codigosExpand =
    registro.expand?.chromebooks
      ?.map((item: Registro) => item.codigo || item.id)
      .filter(Boolean) ?? []

  if (codigosExpand.length > 0) {
    return codigosExpand.join(', ')
  }

  return Array.isArray(registro.chromebooks) ? registro.chromebooks.join(', ') : ''
}

async function autenticarPocketBaseServidor() {
  const pb = new PocketBase(getPocketBaseUrl())

  const email = exigirEnv('PB_SUPERUSER_EMAIL')
  const senha = exigirEnv('PB_SUPERUSER_PASSWORD')

  try {
    await pb.collection('_superusers').authWithPassword(email, senha)
  } catch (erroSuperuser) {
    const admins = (pb as any).admins

    if (!admins?.authWithPassword) {
      throw erroSuperuser
    }

    await admins.authWithPassword(email, senha)
  }

  return pb
}

async function buscarAgendamentos(pb: PocketBase, intervalo: IntervaloMes) {
  const filtroAgendamentos =
    `data >= "${intervalo.inicio}" && ` +
    `data < "${intervalo.fimExclusivo}" && ` +
    `status = "ativo"`

  const [chromebooks, espacos] = await Promise.all([
    pb.collection(AG_COLLECTION).getFullList<Registro>({
      filter: filtroAgendamentos,
      sort: '+data,+inicio',
      expand: 'usuario,chromebooks',
      requestKey: null,
    }),

    pb.collection(ESPACOS_COLLECTION).getFullList<Registro>({
      filter: filtroAgendamentos,
      sort: '+data,+inicio',
      expand: 'usuario',
      requestKey: null,
    }),
  ])

  const mergedAgendamentos = [
    ...chromebooks.map((item) => ({
      ...item,
      origem_relatorio: 'chromebooks' as const,
    })),
    ...espacos.map((item) => ({
      ...item,
      origem_relatorio: 'espaco' as const,
    })),
  ] as RelatorioAgendamento[]

  return mergedAgendamentos.sort((a, b) => {
    const dataA = String(a.data || '').slice(0, 10)
    const dataB = String(b.data || '').slice(0, 10)

    if (dataA !== dataB) return dataA.localeCompare(dataB)

    return Number(a.inicio || 0) - Number(b.inicio || 0)
  })
}

async function buscarChecagens(
  pb: PocketBase,
  intervalo: IntervaloMes
): Promise<ChecagensDoMes> {
  const relatorios = await pb.collection('relatorios_checagem').getFullList<Registro>({
    filter:
      `dataReferencia >= "${intervalo.inicio} 00:00:00" && ` +
      `dataReferencia < "${intervalo.fimExclusivo} 00:00:00"`,
    sort: '+created',
    expand: 'carrinho,verificadoPor',
    requestKey: null,
  })

  if (relatorios.length === 0) {
    return {
      relatorios: [],
      itensPorRelatorio: {},
    }
  }

  const filtroItens = relatorios
    .map((relatorio) => `relatorio = "${relatorio.id}"`)
    .join(' || ')

  const itens = await pb.collection('relatorio_itens').getFullList<Registro>({
    filter: filtroItens,
    sort: '+created',
    expand: 'chromebook',
    requestKey: null,
  })

  const itensPorRelatorio = itens.reduce(
    (acc: Record<string, Registro[]>, item) => {
      const relatorioId = String(item.relatorio || '')

      if (!relatorioId) return acc

      if (!acc[relatorioId]) {
        acc[relatorioId] = []
      }

      acc[relatorioId].push(item)

      return acc
    },
    {}
  )

  return {
    relatorios,
    itensPorRelatorio,
  }
}

function contarProblemasChecagem(checagens: ChecagensDoMes) {
  return checagens.relatorios.reduce((total, relatorio) => {
    return total + Number(relatorio.totalComProblema || 0)
  }, 0)
}

function contarItensChecagem(checagens: ChecagensDoMes) {
  return Object.values(checagens.itensPorRelatorio).reduce((total, itens) => {
    return total + itens.length
  }, 0)
}

function agruparAgendamentosPorDia(agendamentos: Registro[]) {
  return agendamentos.reduce((acc: Record<string, Registro[]>, item) => {
    const data = String(item.data || '').slice(0, 10)

    if (!data) return acc

    if (!acc[data]) {
      acc[data] = []
    }

    acc[data].push(item)

    return acc
  }, {})
}

function agruparChecagensPorDia(checagens: ChecagensDoMes) {
  return checagens.relatorios.reduce((acc: Record<string, Registro[]>, item) => {
    const data = String(item.dataReferencia || item.created || '').slice(0, 10)

    if (!data) return acc

    if (!acc[data]) {
      acc[data] = []
    }

    acc[data].push(item)

    return acc
  }, {})
}

function totaisAgendamentos(agendamentos: Registro[]) {
  const totalChromebooks = agendamentos.filter(
    (item) => item.origem_relatorio === 'chromebooks'
  ).length

  const totalMaker = agendamentos.filter(
    (item) => item.origem_relatorio === 'espaco' && item.tipo === 'maker'
  ).length

  const totalLab = agendamentos.filter(
    (item) => item.origem_relatorio === 'espaco' && item.tipo === 'lab'
  ).length

  const atrasados = agendamentos.filter(
    (item) => item.status_entrega === 'atrasado'
  ).length

  return {
    totalChromebooks,
    totalMaker,
    totalLab,
    atrasados,
  }
}

function montarTabelaResumoPorDia(params: {
  agendamentos: Registro[]
  checagens: ChecagensDoMes
}) {
  const agPorDia = agruparAgendamentosPorDia(params.agendamentos)
  const chPorDia = agruparChecagensPorDia(params.checagens)

  const dias = Array.from(new Set([...Object.keys(agPorDia), ...Object.keys(chPorDia)])).sort()

  if (dias.length === 0) {
    return `<p style="color:#6b7280;">Nenhum registro encontrado no mês.</p>`
  }

  const linhas = dias
    .map((dia) => {
      const agendamentosDia = agPorDia[dia] || []
      const checagensDia = chPorDia[dia] || []

      const itensDia = checagensDia.reduce((total, relatorio) => {
        return total + (params.checagens.itensPorRelatorio[relatorio.id]?.length || 0)
      }, 0)

      const problemasDia = checagensDia.reduce((total, relatorio) => {
        return total + Number(relatorio.totalComProblema || 0)
      }, 0)

      return `
        <tr>
          <td>${escapar(formatarDataBR(dia))}</td>
          <td>${agendamentosDia.length}</td>
          <td>${checagensDia.length}</td>
          <td>${itensDia}</td>
          <td>${problemasDia}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table>
      <thead>
        <tr>
          <th>Dia</th>
          <th>Agendamentos</th>
          <th>Checagens</th>
          <th>Itens checados</th>
          <th>Problemas</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `
}

function montarTabelaAgendamentos(agendamentos: Registro[]) {
  if (agendamentos.length === 0) {
    return `<p style="color:#6b7280;">Nenhum agendamento encontrado no mês.</p>`
  }

  const linhas = agendamentos
    .map((item) => {
      const origem = item.origem_relatorio as 'chromebooks' | 'espaco'
      const recurso = nomeRecursoAgendamento(item, origem)
      const horario = `${minutosParaHora(item.inicio)} às ${minutosParaHora(item.fim)}`
      const turma = nomeTurmaClasse(item)
      const responsavel = nomeUsuario(item)
      const status =
        origem === 'chromebooks'
          ? nomeStatusEntrega(item.status_entrega)
          : 'Reservado'

      const detalhes =
        origem === 'chromebooks'
          ? codigosChromebooks(item)
          : item.observacoes || ''

      return `
        <tr>
          <td>${escapar(formatarDataBR(item.data))}</td>
          <td>${escapar(horario)}</td>
          <td>${escapar(recurso)}</td>
          <td>${escapar(turma)}</td>
          <td>${escapar(responsavel)}</td>
          <td>${escapar(status)}</td>
          <td>${escapar(detalhes || '-')}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Horário</th>
          <th>Recurso</th>
          <th>Turma</th>
          <th>Responsável</th>
          <th>Status</th>
          <th>Detalhes</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `
}

function montarTabelaChecagens(checagens: ChecagensDoMes) {
  if (checagens.relatorios.length === 0) {
    return `<p style="color:#6b7280;">Nenhuma checagem de carrinho encontrada no mês.</p>`
  }

  const linhas = checagens.relatorios
    .map((relatorio) => {
      const itens = checagens.itensPorRelatorio[relatorio.id] || []

      return `
        <tr>
          <td>${escapar(formatarDataBR(relatorio.dataReferencia || relatorio.created))}</td>
          <td>${escapar(formatarDataHoraBR(relatorio.verificadoEm || relatorio.created))}</td>
          <td>${escapar(nomeCarrinho(relatorio))}</td>
          <td>${escapar(relatorio.turno || '-')}</td>
          <td>${escapar(nomeUsuario(relatorio))}</td>
          <td>${escapar(relatorio.totalChromebooks ?? '-')}</td>
          <td>${escapar(relatorio.totalVerificados ?? '-')}</td>
          <td>${escapar(relatorio.totalComProblema ?? '-')}</td>
          <td>${escapar(itens.length)}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table>
      <thead>
        <tr>
          <th>Data</th>
          <th>Horário</th>
          <th>Carrinho</th>
          <th>Turno</th>
          <th>Verificado por</th>
          <th>Total</th>
          <th>Verificados</th>
          <th>Problemas</th>
          <th>Itens</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `
}

function montarHtml(params: {
  intervalo: IntervaloMes
  agendamentos: Registro[]
  checagens: ChecagensDoMes
  erroChecagens?: string
}) {
  const { intervalo, agendamentos, checagens, erroChecagens } = params

  const totais = totaisAgendamentos(agendamentos)
  const totalChecagens = checagens.relatorios.length
  const totalItensChecados = contarItensChecagem(checagens)
  const totalProblemasChecagem = contarProblemasChecagem(checagens)

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f3f4f6;
            color: #111827;
            padding: 24px;
          }

          .container {
            max-width: 1100px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 18px;
            padding: 28px;
            border: 1px solid #e5e7eb;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 26px;
          }

          h2 {
            margin-top: 28px;
            font-size: 20px;
          }

          .muted {
            color: #6b7280;
          }

          .cards {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            margin: 24px 0;
          }

          .card {
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 14px;
            background: #f9fafb;
          }

          .card strong {
            display: block;
            font-size: 24px;
            margin-bottom: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            font-size: 13px;
          }

          th {
            background: #eff6ff;
            color: #1f2937;
            text-align: left;
            padding: 10px;
            border: 1px solid #dbeafe;
          }

          td {
            padding: 10px;
            border: 1px solid #e5e7eb;
            vertical-align: top;
          }

          tr:nth-child(even) td {
            background: #f9fafb;
          }

          .alert {
            border: 1px solid #fecaca;
            background: #fef2f2;
            color: #991b1b;
            border-radius: 12px;
            padding: 12px;
            margin-top: 14px;
          }

          @media (max-width: 800px) {
            .cards {
              grid-template-columns: 1fr 1fr;
            }
          }
        </style>
      </head>

      <body>
        <div class="container">
          <h1>Relatório mensal — ${escapar(intervalo.titulo)}</h1>
          <p class="muted">
            Compilado mensal dos agendamentos e checagens de carrinhos.
          </p>

          <div class="cards">
            <div class="card">
              <strong>${agendamentos.length}</strong>
              <span>Total de agendamentos</span>
            </div>

            <div class="card">
              <strong>${totais.totalChromebooks}</strong>
              <span>Chromebooks</span>
            </div>

            <div class="card">
              <strong>${totais.totalMaker}</strong>
              <span>Sala Maker</span>
            </div>

            <div class="card">
              <strong>${totais.totalLab}</strong>
              <span>Lab. Ciências</span>
            </div>

            <div class="card">
              <strong>${totais.atrasados}</strong>
              <span>Atrasados</span>
            </div>

            <div class="card">
              <strong>${totalChecagens}</strong>
              <span>Checagens</span>
            </div>

            <div class="card">
              <strong>${totalItensChecados}</strong>
              <span>Itens checados</span>
            </div>

            <div class="card">
              <strong>${totalProblemasChecagem}</strong>
              <span>Problemas nas checagens</span>
            </div>
          </div>

          <h2>Resumo por dia</h2>
          ${montarTabelaResumoPorDia({ agendamentos, checagens })}

          <h2>Agendamentos do mês</h2>
          ${montarTabelaAgendamentos(agendamentos)}

          <h2>Checagens de carrinhos do mês</h2>
          ${
            erroChecagens
              ? `<div class="alert">${escapar(erroChecagens)}</div>`
              : montarTabelaChecagens(checagens)
          }

          <p class="muted" style="margin-top: 28px;">
            Relatório enviado automaticamente pelo Sistema de Agendamentos.
          </p>
        </div>
      </body>
    </html>
  `
}

function montarTexto(params: {
  intervalo: IntervaloMes
  agendamentos: Registro[]
  checagens: ChecagensDoMes
  erroChecagens?: string
}) {
  const { intervalo, agendamentos, checagens, erroChecagens } = params

  return [
    `Relatório mensal — ${intervalo.titulo}`,
    '',
    `Total de agendamentos: ${agendamentos.length}`,
    `Total de checagens: ${checagens.relatorios.length}`,
    `Itens checados: ${contarItensChecagem(checagens)}`,
    `Problemas nas checagens: ${contarProblemasChecagem(checagens)}`,
    erroChecagens ? `Erro nas checagens: ${erroChecagens}` : '',
    '',
    'Abra este e-mail em HTML ou consulte o PDF anexado para visualizar o relatório completo.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function gerarPdfRelatorioMensal(params: {
  intervalo: IntervaloMes
  agendamentos: Registro[]
  checagens: ChecagensDoMes
  erroChecagens?: string
}) {
  const { intervalo, agendamentos, checagens, erroChecagens } = params

  const pdfDoc = await PDFDocument.create()
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 42
  const fontSize = 10
  const lineHeight = 14

  let page = pdfDoc.addPage([595.28, 841.89])
  let y = page.getHeight() - margin

  function limparTexto(valor: any) {
    return String(valor ?? '')
      .replaceAll('—', '-')
      .replaceAll('–', '-')
      .replaceAll('“', '"')
      .replaceAll('”', '"')
      .replaceAll('’', "'")
      .replaceAll('•', '-')
      .replace(/\s+/g, ' ')
      .trim()
  }

  function novaPagina() {
    page = pdfDoc.addPage([595.28, 841.89])
    y = page.getHeight() - margin
  }

  function garantirEspaco(altura = 60) {
    if (y < margin + altura) {
      novaPagina()
    }
  }

  function quebrarLinha(texto: string, tamanhoFonte: number, bold = false) {
    const fonte = bold ? fontBold : fontNormal
    const larguraMaxima = page.getWidth() - margin * 2
    const palavras = limparTexto(texto).split(' ')
    const linhas: string[] = []

    let linhaAtual = ''

    for (const palavra of palavras) {
      const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra
      const largura = fonte.widthOfTextAtSize(tentativa, tamanhoFonte)

      if (largura <= larguraMaxima) {
        linhaAtual = tentativa
      } else {
        if (linhaAtual) {
          linhas.push(linhaAtual)
        }

        linhaAtual = palavra
      }
    }

    if (linhaAtual) {
      linhas.push(linhaAtual)
    }

    return linhas.length > 0 ? linhas : ['']
  }

  function escrever(
    texto: any,
    opcoes?: {
      size?: number
      bold?: boolean
      color?: any
      gap?: number
    }
  ) {
    const tamanho = opcoes?.size ?? fontSize
    const bold = opcoes?.bold ?? false
    const fonte = bold ? fontBold : fontNormal
    const cor = opcoes?.color ?? rgb(0.07, 0.09, 0.15)
    const gap = opcoes?.gap ?? 3

    const linhas = quebrarLinha(String(texto ?? ''), tamanho, bold)

    for (const linha of linhas) {
      garantirEspaco(lineHeight + 10)

      page.drawText(linha, {
        x: margin,
        y,
        size: tamanho,
        font: fonte,
        color: cor,
      })

      y -= tamanho + gap
    }

    y -= 3
  }

  function titulo(texto: string) {
    y -= 8
    escrever(texto, {
      size: 15,
      bold: true,
      gap: 5,
    })
  }

  function divisor() {
    garantirEspaco(20)

    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      thickness: 1,
      color: rgb(0.86, 0.86, 0.86),
    })

    y -= 18
  }

  const totais = totaisAgendamentos(agendamentos)
  const totalChecagens = checagens.relatorios.length
  const totalItensChecados = contarItensChecagem(checagens)
  const totalProblemasChecagem = contarProblemasChecagem(checagens)

  escrever(`Relatorio mensal - ${intervalo.titulo}`, {
    size: 20,
    bold: true,
  })

  escrever('Compilado mensal dos agendamentos e checagens de carrinhos.', {
    size: 10,
    color: rgb(0.37, 0.41, 0.49),
  })

  divisor()

  titulo('Resumo geral')

  escrever(`Periodo: ${formatarDataBR(intervalo.inicio)} ate ${formatarDataBR(intervalo.fimExclusivo)}`)
  escrever(`Total de agendamentos: ${agendamentos.length}`)
  escrever(`Chromebooks: ${totais.totalChromebooks}`)
  escrever(`Sala Maker: ${totais.totalMaker}`)
  escrever(`Lab. de Ciencias: ${totais.totalLab}`)
  escrever(`Atrasados: ${totais.atrasados}`)
  escrever(`Checagens de carrinhos: ${totalChecagens}`)
  escrever(`Itens checados: ${totalItensChecados}`)
  escrever(`Problemas nas checagens: ${totalProblemasChecagem}`)

  divisor()

  titulo('Resumo por dia')

  const agPorDia = agruparAgendamentosPorDia(agendamentos)
  const chPorDia = agruparChecagensPorDia(checagens)
  const dias = Array.from(new Set([...Object.keys(agPorDia), ...Object.keys(chPorDia)])).sort()

  if (dias.length === 0) {
    escrever('Nenhum registro encontrado no mes.')
  } else {
    for (const dia of dias) {
      garantirEspaco(50)

      const agendamentosDia = agPorDia[dia] || []
      const checagensDia = chPorDia[dia] || []

      const itensDia = checagensDia.reduce((total, relatorio) => {
        return total + (checagens.itensPorRelatorio[relatorio.id]?.length || 0)
      }, 0)

      const problemasDia = checagensDia.reduce((total, relatorio) => {
        return total + Number(relatorio.totalComProblema || 0)
      }, 0)

      escrever(
        `${formatarDataBR(dia)} - Agendamentos: ${agendamentosDia.length} | Checagens: ${checagensDia.length} | Itens: ${itensDia} | Problemas: ${problemasDia}`
      )
    }
  }

  divisor()

  titulo('Agendamentos do mes')

  if (agendamentos.length === 0) {
    escrever('Nenhum agendamento encontrado no mes.')
  } else {
    for (const item of agendamentos) {
      garantirEspaco(90)

      const origem = item.origem_relatorio as 'chromebooks' | 'espaco'
      const recurso = nomeRecursoAgendamento(item, origem)
      const horario = `${minutosParaHora(item.inicio)} as ${minutosParaHora(item.fim)}`
      const turma = nomeTurmaClasse(item)
      const responsavel = nomeUsuario(item)
      const status =
        origem === 'chromebooks'
          ? nomeStatusEntrega(item.status_entrega)
          : 'Reservado'

      const detalhes =
        origem === 'chromebooks'
          ? codigosChromebooks(item)
          : item.observacoes || ''

      escrever(`${formatarDataBR(item.data)} - ${horario} - ${recurso}`, {
        bold: true,
        size: 11,
      })

      escrever(`Turma: ${turma}`)
      escrever(`Responsavel: ${responsavel}`)
      escrever(`Status: ${status}`)

      if (detalhes) {
        escrever(`Detalhes: ${detalhes}`)
      }

      y -= 5
    }
  }

  divisor()

  titulo('Checagens do mes')

  if (erroChecagens) {
    escrever(`Erro ao carregar checagens: ${erroChecagens}`)
  } else if (checagens.relatorios.length === 0) {
    escrever('Nenhuma checagem de carrinho encontrada no mes.')
  } else {
    for (const relatorio of checagens.relatorios) {
      garantirEspaco(100)

      const itens = checagens.itensPorRelatorio[relatorio.id] || []

      escrever(
        `${formatarDataBR(relatorio.dataReferencia || relatorio.created)} - Carrinho ${nomeCarrinho(relatorio)}`,
        {
          bold: true,
          size: 11,
        }
      )

      escrever(`Horario: ${formatarDataHoraBR(relatorio.verificadoEm || relatorio.created)}`)
      escrever(`Turno: ${relatorio.turno || '-'}`)
      escrever(`Verificado por: ${nomeUsuario(relatorio)}`)
      escrever(`Total: ${relatorio.totalChromebooks ?? '-'}`)
      escrever(`Verificados: ${relatorio.totalVerificados ?? '-'}`)
      escrever(`Problemas: ${relatorio.totalComProblema ?? '-'}`)
      escrever(`Itens registrados: ${itens.length}`)

      if (relatorio.observacaoGeral) {
        escrever(`Observacao geral: ${relatorio.observacaoGeral}`)
      }

      y -= 5
    }
  }

  garantirEspaco(30)

  escrever('Relatorio enviado automaticamente pelo Sistema de Agendamentos.', {
    size: 9,
    color: rgb(0.42, 0.45, 0.50),
  })

  const pdfBytes = await pdfDoc.save()

  return Buffer.from(pdfBytes)
}

async function enviarEmail(params: {
  intervalo: IntervaloMes
  html: string
  text: string
  pdfBuffer?: Buffer
}) {
  const host = exigirEnv('SMTP_HOST')
  const port = Number(exigirEnv('SMTP_PORT'))
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true'
  const user = exigirEnv('SMTP_USER')
  const pass = exigirEnv('SMTP_PASS')
  const from = process.env.SMTP_FROM || user
  const to = exigirEnv('REPORT_EMAIL_TO')

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  })

  await transporter.sendMail({
    from,
    to,
    subject: `Relatório mensal — ${params.intervalo.titulo}`,
    text: params.text,
    html: params.html,
    attachments: params.pdfBuffer
      ? [
          {
            filename: `relatorio-mensal-${params.intervalo.mes}.pdf`,
            content: params.pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : [],
  })
}

async function executarRelatorio(request: NextRequest) {
  try {
    const secretConfigurado = exigirEnv('REPORT_CRON_SECRET')
    const secretRecebido =
      request.headers.get('x-cron-secret') ||
      new URL(request.url).searchParams.get('secret')

    if (secretRecebido !== secretConfigurado) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Não autorizado.',
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const intervalo = obterIntervaloMes(url.searchParams.get('mes'))

    const pb = await autenticarPocketBaseServidor()

    const agendamentos = await buscarAgendamentos(pb, intervalo)

    let checagens: ChecagensDoMes = {
      relatorios: [],
      itensPorRelatorio: {},
    }

    let erroChecagens = ''

    try {
      checagens = await buscarChecagens(pb, intervalo)
    } catch (error: any) {
      console.error('Erro ao buscar checagens:', error)

      erroChecagens =
        `Não foi possível carregar as checagens. ` +
        `Erro: ${error?.message || 'desconhecido'}`
    }

    const html = montarHtml({
      intervalo,
      agendamentos,
      checagens,
      erroChecagens,
    })

    const text = montarTexto({
      intervalo,
      agendamentos,
      checagens,
      erroChecagens,
    })

    const pdfBuffer = await gerarPdfRelatorioMensal({
      intervalo,
      agendamentos,
      checagens,
      erroChecagens,
    })

    await enviarEmail({
      intervalo,
      html,
      text,
      pdfBuffer,
    })

    return NextResponse.json({
      ok: true,
      mes: intervalo.mes,
      periodo: {
        inicio: intervalo.inicio,
        fimExclusivo: intervalo.fimExclusivo,
      },
      agendamentos: agendamentos.length,
      checagens: checagens.relatorios.length,
      itensChecagem: contarItensChecagem(checagens),
      problemasChecagem: contarProblemasChecagem(checagens),
      pdf: true,
      erroChecagens: erroChecagens || null,
    })
  } catch (error: any) {
    console.error('Erro ao gerar/enviar relatório mensal:', error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Erro ao gerar/enviar relatório mensal.',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return executarRelatorio(request)
}

export async function POST(request: NextRequest) {
  return executarRelatorio(request)
}