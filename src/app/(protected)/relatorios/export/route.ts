import { NextResponse, type NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { dataBR, hojeISO, competenciaBR } from '@/lib/format'
import {
  buildRelatorio,
  dadosPrestacao,
  isRelatorioId,
  type Coluna,
  type Relatorio,
  type DadosPrestacao,
} from '../data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const tipoParam = sp.get('tipo') ?? 'empresas'
  const formato = sp.get('formato') ?? 'csv'
  const de = sp.get('de') || undefined
  const ate = sp.get('ate') || undefined

  if (!isRelatorioId(tipoParam)) {
    return NextResponse.json({ error: 'Relatório inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const nomeBase = `relatorio-${tipoParam}-${hojeISO()}`

  // Prestação de contas em XLSX: planilha completa (multi-aba) com todos os cálculos
  if (tipoParam === 'prestacao' && formato === 'xlsx') {
    const dados = await dadosPrestacao(supabase, de, ate)
    const buf = await gerarXLSXPrestacao(dados)
    return arquivo(
      buf,
      `prestacao-de-contas-${hojeISO()}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  }

  const rel = await buildRelatorio(supabase, tipoParam, de, ate)

  if (formato === 'csv') {
    const body = '﻿' + gerarCSV(rel)
    return arquivo(body, `${nomeBase}.csv`, 'text/csv; charset=utf-8')
  }
  if (formato === 'xlsx') {
    const buf = await gerarXLSX(rel)
    return arquivo(
      buf,
      `${nomeBase}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  }
  if (formato === 'pdf') {
    const buf = await gerarPDF(rel, { de, ate })
    return arquivo(buf, `${nomeBase}.pdf`, 'application/pdf')
  }
  return NextResponse.json({ error: 'Formato inválido' }, { status: 400 })
}

function arquivo(body: string | Uint8Array, nome: string, contentType: string) {
  return new NextResponse(body as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${nome}"`,
      'Cache-Control': 'no-store',
    },
  })
}

// ------------------------------ CSV ------------------------------
function csvCell(value: unknown, tipo: Coluna['tipo']): string {
  if (value === null || value === undefined) return ''
  let s: string
  if (tipo === 'money') s = Number(value).toFixed(2).replace('.', ',')
  else if (tipo === 'date') s = dataBR(String(value))
  else s = String(value)
  if (/[";\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

function gerarCSV(rel: Relatorio): string {
  const linhas = [rel.colunas.map((c) => c.label).join(';')]
  for (const l of rel.linhas) {
    linhas.push(rel.colunas.map((c) => csvCell(l[c.key], c.tipo)).join(';'))
  }
  return linhas.join('\r\n')
}

// ------------------------------ XLSX ------------------------------
async function gerarXLSX(rel: Relatorio): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Relatório')

  ws.columns = rel.colunas.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.tipo === 'text' ? 28 : 16,
  }))
  ws.getRow(1).font = { bold: true }

  for (const l of rel.linhas) {
    const row: Record<string, unknown> = {}
    for (const c of rel.colunas) {
      const v = l[c.key]
      if (c.tipo === 'money' || c.tipo === 'number') row[c.key] = v == null ? 0 : Number(v)
      else if (c.tipo === 'date') row[c.key] = dataBR(String(v))
      else row[c.key] = v == null ? '' : String(v)
    }
    ws.addRow(row)
  }

  rel.colunas.forEach((c, i) => {
    if (c.tipo === 'money') ws.getColumn(i + 1).numFmt = '"R$" #,##0.00'
  })

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

// ------------------- XLSX Prestação de contas -------------------

const MONEY_FMT = '"R$" #,##0.00'
const AZUL = 'FF1F6F54' // cabeçalhos
const CINZA_CLARO = 'FFF3F4F6'

function periodoLabel(d: DadosPrestacao): string {
  if (d.de && d.ate) return `${competenciaBR(d.de)} a ${competenciaBR(d.ate)}`
  if (d.de) return `a partir de ${competenciaBR(d.de)}`
  if (d.ate) return `até ${competenciaBR(d.ate)}`
  return 'todos os meses'
}

function estiloHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } }
    cell.alignment = { vertical: 'middle' }
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } } }
  })
}

function estiloTotal(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_CLARO } }
    cell.border = { top: { style: 'thin', color: { argb: 'FF888888' } } }
  })
}

async function gerarXLSXPrestacao(d: DadosPrestacao): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gestão Financeira GB'
  wb.created = new Date()

  // ===== Aba 1: Resumo (com o rateio final) =====
  const resumo = wb.addWorksheet('Resumo', { views: [{ showGridLines: false }] })
  resumo.columns = [
    { width: 30 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ]

  resumo.mergeCells('A1:D1')
  const t1 = resumo.getCell('A1')
  t1.value = 'Prestação de Contas — Aluguéis'
  t1.font = { bold: true, size: 16 }

  resumo.mergeCells('A2:D2')
  resumo.getCell('A2').value = `Período: ${periodoLabel(d)}`
  resumo.getCell('A2').font = { color: { argb: 'FF666666' } }
  resumo.mergeCells('A3:D3')
  resumo.getCell('A3').value = `Emitido em ${dataBR(hojeISO())}`
  resumo.getCell('A3').font = { color: { argb: 'FF666666' } }

  // Bloco de totais
  const totais: [string, number][] = [
    ['Total de aluguéis recebidos', d.totalRecebido],
    ['Total de despesas', d.totalDespesas],
    ['Líquido a dividir', d.liquido],
  ]
  let r = 5
  for (const [rot, val] of totais) {
    resumo.getCell(`A${r}`).value = rot
    resumo.getCell(`A${r}`).font = { bold: r === 7 }
    const cVal = resumo.getCell(`B${r}`)
    cVal.value = val
    cVal.numFmt = MONEY_FMT
    cVal.font = { bold: r === 7, color: { argb: r === 6 ? 'FFB00000' : 'FF1F6F54' } }
    r++
  }

  // Tabela do rateio por irmão
  r += 1
  resumo.mergeCells(`A${r}:D${r}`)
  resumo.getCell(`A${r}`).value = 'Rateio entre os irmãos'
  resumo.getCell(`A${r}`).font = { bold: true, size: 12 }
  r++

  const headRow = resumo.getRow(r)
  headRow.values = ['Irmão', 'Recebido', 'Despesas (rateio)', 'Líquido a receber']
  estiloHeader(headRow)
  r++

  for (const i of d.irmaos) {
    const row = resumo.getRow(r)
    row.values = [i.nome, i.recebido, i.despesa_rateada, i.liquido]
    row.getCell(2).numFmt = MONEY_FMT
    row.getCell(3).numFmt = MONEY_FMT
    row.getCell(4).numFmt = MONEY_FMT
    row.getCell(4).font = { bold: true, color: { argb: 'FF1F6F54' } }
    r++
  }

  const totalRow = resumo.getRow(r)
  totalRow.values = ['TOTAL', d.totalRecebido, d.totalDespesas, d.liquido]
  totalRow.getCell(2).numFmt = MONEY_FMT
  totalRow.getCell(3).numFmt = MONEY_FMT
  totalRow.getCell(4).numFmt = MONEY_FMT
  estiloTotal(totalRow)

  // ===== Aba 2: Aluguéis recebidos =====
  const ws2 = wb.addWorksheet('Aluguéis recebidos', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws2.columns = [
    { header: 'Mês', key: 'mes', width: 12 },
    { header: 'Imóvel', key: 'imovel', width: 24 },
    { header: 'Unidade / descrição', key: 'unidade', width: 26 },
    { header: 'Vencimento', key: 'venc', width: 14 },
    { header: 'Pago em', key: 'pago', width: 14 },
    { header: 'Observação', key: 'obs', width: 28 },
    { header: 'Valor', key: 'valor', width: 16 },
  ]
  estiloHeader(ws2.getRow(1))
  for (const rec of d.recebidos) {
    const row = ws2.addRow({
      mes: competenciaBR(rec.competencia),
      imovel: rec.imovel,
      unidade: rec.unidade ?? '—',
      venc: dataBR(rec.vencimento),
      pago: rec.data_pagamento ? dataBR(rec.data_pagamento) : '—',
      obs: rec.observacao ?? '',
      valor: rec.valor,
    })
    row.getCell('valor').numFmt = MONEY_FMT
  }
  const totRec = ws2.addRow({ obs: 'TOTAL RECEBIDO', valor: d.totalRecebido })
  totRec.getCell('valor').numFmt = MONEY_FMT
  estiloTotal(totRec)

  // ===== Aba 3: Despesas =====
  const ws3 = wb.addWorksheet('Despesas', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws3.columns = [
    { header: 'Mês', key: 'mes', width: 12 },
    { header: 'Descrição', key: 'descricao', width: 36 },
    { header: 'Descontar de', key: 'descontar', width: 26 },
    { header: 'Lançado em', key: 'lancado', width: 16 },
    { header: 'Valor', key: 'valor', width: 16 },
  ]
  estiloHeader(ws3.getRow(1))
  for (const desp of d.despesas) {
    const row = ws3.addRow({
      mes: competenciaBR(desp.competencia),
      descricao: desp.descricao,
      descontar: desp.descontar_de,
      lancado: desp.data_lancamento ? dataBR(desp.data_lancamento) : '—',
      valor: desp.valor,
    })
    row.getCell('valor').numFmt = MONEY_FMT
  }
  const totDesp = ws3.addRow({ lancado: 'TOTAL DESPESAS', valor: d.totalDespesas })
  totDesp.getCell('valor').numFmt = MONEY_FMT
  estiloTotal(totDesp)

  const buf = await wb.xlsx.writeBuffer()
  return new Uint8Array(buf)
}

// ------------------------------ PDF ------------------------------
/** Remove caracteres fora do WinAnsi (pdf-lib/Helvetica não os codifica). */
function pdfSafe(s: string): string {
  return s
    .replace(/[—–]/g, '-')
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x00-\xFF]/g, '')
}

function pdfCell(value: unknown, tipo: Coluna['tipo']): string {
  if (value === null || value === undefined || value === '') return tipo === 'money' ? 'R$ 0,00' : ''
  if (tipo === 'money')
    return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (tipo === 'date') return dataBR(String(value))
  return String(value)
}

function truncar(
  texto: string,
  font: import('pdf-lib').PDFFont,
  size: number,
  maxW: number,
): string {
  if (font.widthOfTextAtSize(texto, size) <= maxW) return texto
  let t = texto
  while (t.length > 1 && font.widthOfTextAtSize(t + '...', size) > maxW) t = t.slice(0, -1)
  return t + '...'
}

async function gerarPDF(rel: Relatorio, periodo: { de?: string; ate?: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageW = 842
  const pageH = 595
  const margin = 40
  const avail = pageW - margin * 2
  const size = 9
  const rowH = 18

  // pesos de largura: colunas de texto ocupam mais espaço
  const pesos = rel.colunas.map((c) => (c.tipo === 'text' ? 2 : 1))
  const somaPesos = pesos.reduce((s, p) => s + p, 0)
  const larguras = pesos.map((p) => (avail * p) / somaPesos)
  const xs: number[] = []
  let acc = margin
  for (const w of larguras) {
    xs.push(acc)
    acc += w
  }

  const cinza = rgb(0.45, 0.45, 0.45)
  const preto = rgb(0.1, 0.1, 0.1)

  let page = doc.addPage([pageW, pageH])
  let y = pageH - margin

  const subtitulo = () => {
    const partes = [`${rel.linhas.length} registro(s)`]
    if (rel.usaPeriodo && (periodo.de || periodo.ate))
      partes.push(`período ${periodo.de ? dataBR(periodo.de) : '...'} a ${periodo.ate ? dataBR(periodo.ate) : '...'}`)
    partes.push(`emitido em ${dataBR(hojeISO())}`)
    return partes.join('  ·  ')
  }

  const desenharCabecalho = () => {
    page.drawText(pdfSafe(rel.titulo), { x: margin, y: y - 14, size: 16, font: bold, color: preto })
    page.drawText(pdfSafe(subtitulo()), { x: margin, y: y - 30, size: 8, font, color: cinza })
    y -= 48
    // linha de header da tabela
    rel.colunas.forEach((c, i) => {
      const label = truncar(pdfSafe(c.label), bold, size, larguras[i] - 6)
      const alinhaDir = c.tipo === 'money' || c.tipo === 'number'
      const x = alinhaDir
        ? xs[i] + larguras[i] - 4 - bold.widthOfTextAtSize(label, size)
        : xs[i] + 2
      page.drawText(label, { x, y: y - 12, size, font: bold, color: preto })
    })
    y -= rowH
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: pageW - margin, y: y + 4 },
      thickness: 0.5,
      color: cinza,
    })
  }

  desenharCabecalho()

  for (const linha of rel.linhas) {
    if (y < margin + rowH) {
      page = doc.addPage([pageW, pageH])
      y = pageH - margin
      desenharCabecalho()
    }
    rel.colunas.forEach((c, i) => {
      const texto = truncar(pdfSafe(pdfCell(linha[c.key], c.tipo)), font, size, larguras[i] - 6)
      const alinhaDir = c.tipo === 'money' || c.tipo === 'number'
      const x = alinhaDir
        ? xs[i] + larguras[i] - 4 - font.widthOfTextAtSize(texto, size)
        : xs[i] + 2
      page.drawText(texto, { x, y: y - 12, size, font, color: preto })
    })
    y -= rowH
  }

  return doc.save()
}
