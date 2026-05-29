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

type ChecagensDoDia = {
  relatorios: Registro[]
  itensPorRelatorio: Record<string, Registro[]>
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

function hojeISO() {
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

function somarDias(dataISO: string, dias: number) {
  const data = criarDataLocal(dataISO)
  data.setDate(data.getDate() + dias)
  return formatarDataISO(data)
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

function nomeChromebook(item: Registro) {
  return (
    item.expand?.chromebook?.codigo ||
    item.expand?.chromebook?.nome ||
    item.expand?.chromebook?.name ||
    item.chromebook ||
    '-'
  )
}

function nomeTurmaClasse(registro: Registro) {
  if (!registro.turma) return '-'

  if (!registro.classe) {
    return registro.turma
  }

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

async function buscarAgendamentos(pb: PocketBase, dataISO: string) {
  const amanhaISO = somarDias(dataISO, 1)

  const filtroAgendamentos =
    `data >= "${dataISO}" && ` +
    `data < "${amanhaISO}" && ` +
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
  dataISO: string
): Promise<ChecagensDoDia> {
  const amanhaISO = somarDias(dataISO, 1)

  const relatorios = await pb.collection('relatorios_checagem').getFullList<Registro>({
    filter:
      `dataReferencia >= "${dataISO} 00:00:00" && ` +
      `dataReferencia < "${amanhaISO} 00:00:00"`,
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

function montarTabelaAgendamentos(agendamentos: Registro[]) {
  if (agendamentos.length === 0) {
    return `<p style="color:#6b7280;">Nenhum agendamento encontrado para este dia.</p>`
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

function montarTabelaItensChecagem(itens: Registro[]) {
  if (itens.length === 0) {
    return `<p style="color:#6b7280; margin: 8px 0 0;">Nenhum item registrado.</p>`
  }

  const linhas = itens
    .map((item) => {
      return `
        <tr>
          <td>${escapar(nomeChromebook(item))}</td>
          <td>${escapar(item.verificado ? 'Sim' : 'Não')}</td>
          <td>${escapar(item.statusEncontrado || '-')}</td>
          <td>${escapar(item.observacao || '-')}</td>
        </tr>
      `
    })
    .join('')

  return `
    <table style="margin-top: 8px;">
      <thead>
        <tr>
          <th>Chromebook</th>
          <th>Verificado</th>
          <th>Status encontrado</th>
          <th>Observação</th>
        </tr>
      </thead>
      <tbody>
        ${linhas}
      </tbody>
    </table>
  `
}

function montarTabelaChecagens(checagens: ChecagensDoDia) {
  if (checagens.relatorios.length === 0) {
    return `<p style="color:#6b7280;">Nenhuma checagem de carrinho encontrada para este dia.</p>`
  }

  const blocos = checagens.relatorios
    .map((relatorio) => {
      const itens = checagens.itensPorRelatorio[relatorio.id] || []

      return `
        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px; margin-top:14px;">
          <h3 style="margin:0 0 8px; font-size:16px;">
            Carrinho ${escapar(nomeCarrinho(relatorio))}
          </h3>

          <table>
            <tbody>
              <tr>
                <th>Data da checagem</th>
                <td>${escapar(formatarDataBR(relatorio.dataReferencia || relatorio.created))}</td>
              </tr>
              <tr>
                <th>Horário</th>
                <td>${escapar(formatarDataHoraBR(relatorio.verificadoEm || relatorio.created))}</td>
              </tr>
              <tr>
                <th>Turno</th>
                <td>${escapar(relatorio.turno || '-')}</td>
              </tr>
              <tr>
                <th>Verificado por</th>
                <td>${escapar(nomeUsuario(relatorio))}</td>
              </tr>
              <tr>
                <th>Total de Chromebooks</th>
                <td>${escapar(relatorio.totalChromebooks ?? '-')}</td>
              </tr>
              <tr>
                <th>Total verificados</th>
                <td>${escapar(relatorio.totalVerificados ?? '-')}</td>
              </tr>
              <tr>
                <th>Total com problema</th>
                <td>${escapar(relatorio.totalComProblema ?? '-')}</td>
              </tr>
              <tr>
                <th>Observação geral</th>
                <td>${escapar(relatorio.observacaoGeral || '-')}</td>
              </tr>
            </tbody>
          </table>

          ${montarTabelaItensChecagem(itens)}
        </div>
      `
    })
    .join('')

  return blocos
}

function contarProblemasChecagem(checagens: ChecagensDoDia) {
  return checagens.relatorios.reduce((total, relatorio) => {
    return total + Number(relatorio.totalComProblema || 0)
  }, 0)
}

function contarItensChecagem(checagens: ChecagensDoDia) {
  return Object.values(checagens.itensPorRelatorio).reduce((total, itens) => {
    return total + itens.length
  }, 0)
}

function montarHtml(params: {
  dataISO: string
  agendamentos: Registro[]
  checagens: ChecagensDoDia
  erroChecagens?: string
}) {
  const { dataISO, agendamentos, checagens, erroChecagens } = params

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
          <h1>Relatório diário — ${escapar(formatarDataBR(dataISO))}</h1>
          <p class="muted">
            Resumo automático dos agendamentos e checagens de carrinhos do dia.
          </p>

          <div class="cards">
            <div class="card">
              <strong>${agendamentos.length}</strong>
              <span>Total de agendamentos</span>
            </div>

            <div class="card">
              <strong>${totalChromebooks}</strong>
              <span>Chromebooks</span>
            </div>

            <div class="card">
              <strong>${totalMaker}</strong>
              <span>Sala Maker</span>
            </div>

            <div class="card">
              <strong>${totalLab}</strong>
              <span>Lab. Ciências</span>
            </div>

            <div class="card">
              <strong>${atrasados}</strong>
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

          <h2>Agendamentos do dia</h2>
          ${montarTabelaAgendamentos(agendamentos)}

          <h2>Checagens de carrinhos</h2>
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
  dataISO: string
  agendamentos: Registro[]
  checagens: ChecagensDoDia
  erroChecagens?: string
}) {
  const { dataISO, agendamentos, checagens, erroChecagens } = params

  return [
    `Relatório diário — ${formatarDataBR(dataISO)}`,
    '',
    `Total de agendamentos: ${agendamentos.length}`,
    `Total de checagens: ${checagens.relatorios.length}`,
    `Itens checados: ${contarItensChecagem(checagens)}`,
    `Problemas nas checagens: ${contarProblemasChecagem(checagens)}`,
    erroChecagens ? `Erro nas checagens: ${erroChecagens}` : '',
    '',
    'Abra este e-mail em HTML para visualizar as tabelas completas.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function gerarPdfRelatorio(params: {
  dataISO: string
  agendamentos: Registro[]
  checagens: ChecagensDoDia
  erroChecagens?: string
}) {
  const { dataISO, agendamentos, checagens, erroChecagens } = params

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

  function subtitulo(texto: string) {
    y -= 5
    escrever(texto, {
      size: 12,
      bold: true,
      gap: 4,
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

  const totalChecagens = checagens.relatorios.length
  const totalItensChecados = contarItensChecagem(checagens)
  const totalProblemasChecagem = contarProblemasChecagem(checagens)

  escrever(`Relatorio diario - ${formatarDataBR(dataISO)}`, {
    size: 20,
    bold: true,
  })

  escrever('Resumo automatico dos agendamentos e checagens de carrinhos do dia.', {
    size: 10,
    color: rgb(0.37, 0.41, 0.49),
  })

  divisor()

  titulo('Resumo')

  escrever(`Total de agendamentos: ${agendamentos.length}`)
  escrever(`Chromebooks: ${totalChromebooks}`)
  escrever(`Sala Maker: ${totalMaker}`)
  escrever(`Lab. de Ciencias: ${totalLab}`)
  escrever(`Atrasados: ${atrasados}`)
  escrever(`Checagens de carrinhos: ${totalChecagens}`)
  escrever(`Itens checados: ${totalItensChecados}`)
  escrever(`Problemas nas checagens: ${totalProblemasChecagem}`)

  divisor()

  titulo('Agendamentos do dia')

  if (agendamentos.length === 0) {
    escrever('Nenhum agendamento encontrado para este dia.')
  } else {
    for (const item of agendamentos) {
      garantirEspaco(100)

      const origem = item.origem_relatorio as 'chromebooks' | 'espaco'
      const recurso = nomeRecursoAgendamento(item, origem)
      const horario = `${minutosParaHora(item.inicio)} as ${minutosParaHora(
        item.fim
      )}`
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

  titulo('Checagens de carrinhos')

  if (erroChecagens) {
    escrever(`Erro ao carregar checagens: ${erroChecagens}`)
  } else if (checagens.relatorios.length === 0) {
    escrever('Nenhuma checagem de carrinho encontrada para este dia.')
  } else {
    for (const relatorio of checagens.relatorios) {
      garantirEspaco(130)

      const itens = checagens.itensPorRelatorio[relatorio.id] || []

      subtitulo(`Carrinho ${nomeCarrinho(relatorio)}`)

      escrever(`Data: ${formatarDataBR(relatorio.dataReferencia || relatorio.created)}`)
      escrever(`Horario: ${formatarDataHoraBR(relatorio.verificadoEm || relatorio.created)}`)
      escrever(`Turno: ${relatorio.turno || '-'}`)
      escrever(`Verificado por: ${nomeUsuario(relatorio)}`)
      escrever(`Total de Chromebooks: ${relatorio.totalChromebooks ?? '-'}`)
      escrever(`Total verificados: ${relatorio.totalVerificados ?? '-'}`)
      escrever(`Total com problema: ${relatorio.totalComProblema ?? '-'}`)

      if (relatorio.observacaoGeral) {
        escrever(`Observacao geral: ${relatorio.observacaoGeral}`)
      }

      if (itens.length > 0) {
        subtitulo('Itens verificados')

        for (const item of itens) {
          garantirEspaco(55)

          const verificado = item.verificado ? 'Sim' : 'Nao'
          const status = item.statusEncontrado || '-'
          const observacao = item.observacao || '-'

          escrever(
            `- ${nomeChromebook(item)} | Verificado: ${verificado} | Status: ${status} | Obs: ${observacao}`
          )
        }
      } else {
        escrever('Nenhum item registrado neste carrinho.')
      }

      y -= 8
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
  dataISO: string
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
    subject: `Relatório diário — ${formatarDataBR(params.dataISO)}`,
    text: params.text,
    html: params.html,
    attachments: params.pdfBuffer
      ? [
          {
            filename: `relatorio-diario-${params.dataISO}.pdf`,
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

    const dataISO = new URL(request.url).searchParams.get('data') || hojeISO()

    const pb = await autenticarPocketBaseServidor()

    const agendamentos = await buscarAgendamentos(pb, dataISO)

    let checagens: ChecagensDoDia = {
      relatorios: [],
      itensPorRelatorio: {},
    }

    let erroChecagens = ''

    try {
      checagens = await buscarChecagens(pb, dataISO)
    } catch (error: any) {
      console.error('Erro ao buscar checagens:', error)

      erroChecagens =
        `Não foi possível carregar as checagens. ` +
        `Erro: ${error?.message || 'desconhecido'}`
    }

    const html = montarHtml({
      dataISO,
      agendamentos,
      checagens,
      erroChecagens,
    })

    const text = montarTexto({
      dataISO,
      agendamentos,
      checagens,
      erroChecagens,
    })

    const pdfBuffer = await gerarPdfRelatorio({
      dataISO,
      agendamentos,
      checagens,
      erroChecagens,
    })

    await enviarEmail({
      dataISO,
      html,
      text,
      pdfBuffer,
    })

    return NextResponse.json({
      ok: true,
      data: dataISO,
      agendamentos: agendamentos.length,
      checagens: checagens.relatorios.length,
      itensChecagem: contarItensChecagem(checagens),
      problemasChecagem: contarProblemasChecagem(checagens),
      pdf: true,
      erroChecagens: erroChecagens || null,
    })
  } catch (error: any) {
    console.error('Erro ao gerar/enviar relatório diário:', error)

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'Erro ao gerar/enviar relatório diário.',
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