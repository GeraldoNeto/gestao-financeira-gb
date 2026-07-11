/** Formata número como moeda brasileira (R$). */
export function brl(valor: number | null | undefined): string {
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

/**
 * Formata data como dd/mm/aaaa.
 * Strings date-only (aaaa-mm-dd) são formatadas sem passar por `new Date`
 * para evitar deslocamento de um dia por fuso horário.
 */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return new Date(iso).toLocaleDateString('pt-BR')
}

/**
 * Converte texto de valor em número (aceita "1.234,56", "1234,56", "1234.56", "R$ 100").
 * Retorna null se inválido ou negativo.
 */
export function parseValorBRL(texto: string): number | null {
  const t = texto.trim().replace(/^R\$\s*/i, '').replace(/\s/g, '')
  if (!t) return null
  let n: number
  if (/,\d{1,2}$/.test(t)) {
    // formato brasileiro: pontos são milhar, vírgula é decimal
    n = Number(t.replace(/\./g, '').replace(',', '.'))
  } else {
    // formato com ponto decimal (ou inteiro); vírgulas seriam milhar
    n = Number(t.replace(/,/g, ''))
  }
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Data de hoje no formato aaaa-mm-dd (para input type=date). */
export function hojeISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Formata uma competência (data do 1º dia do mês, ou aaaa-mm) como MM/AAAA. */
export function competenciaBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})/.exec(iso)
  return m ? `${m[2]}/${m[1]}` : iso
}

/** Mês atual como aaaa-mm (para input type=month). */
export function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Último dia do mês aaaa-mm como aaaa-mm-dd (ex.: '2026-02' → '2026-02-28'). */
export function ultimoDiaMes(mes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) return mes
  const dia = new Date(Number(m[1]), Number(m[2]), 0).getDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}
