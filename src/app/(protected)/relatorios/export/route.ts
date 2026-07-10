import { NextResponse, type NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { dataBR, hojeISO } from '@/lib/format'
import { buildRelatorio, isRelatorioId, type Coluna, type Relatorio } from '../data'

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

  const rel = await buildRelatorio(supabase, tipoParam, de, ate)
  const nomeBase = `relatorio-${tipoParam}-${hojeISO()}`

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
