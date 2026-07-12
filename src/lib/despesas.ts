import { ultimoDiaMes } from '@/lib/format'

export type Recorrente = {
  id_recorrente: number
  id_contrato: number
  descricao: string
  valor: number
  data_inicio: string
  data_fim: string | null
}

/** Uma despesa "efetiva" de um mês (avulsa de despesas_mes ou recorrente expandida). */
export type DespesaEfetiva = {
  id_despesa: number | null
  id_recorrente: number | null
  id_contrato: number | null
  competencia: string
  data: string | null
  descricao: string
  valor: number
}

const primeiroDia = (competencia: string) => competencia.slice(0, 10) // 'YYYY-MM-01'
const ultimoDia = (competencia: string) => ultimoDiaMes(competencia.slice(0, 7))

/** A recorrente está ativa nesta competência (mês)? */
export function recorrenteAtiva(rec: Recorrente, competencia: string): boolean {
  const ini = primeiroDia(competencia)
  const fim = ultimoDia(competencia)
  return rec.data_inicio <= fim && (rec.data_fim == null || rec.data_fim >= ini)
}

/** Expande as recorrentes ativas em uma competência como despesas efetivas. */
export function recorrentesNaCompetencia(recs: Recorrente[], competencia: string): DespesaEfetiva[] {
  return recs
    .filter((r) => recorrenteAtiva(r, competencia))
    .map((r) => ({
      id_despesa: null,
      id_recorrente: r.id_recorrente,
      id_contrato: r.id_contrato,
      competencia,
      data: primeiroDia(competencia),
      descricao: r.descricao,
      valor: Number(r.valor),
    }))
}

/** Lista de competências (aaaa-mm-01) entre dois meses, inclusive. */
export function competenciasEntre(deComp: string, ateComp: string): string[] {
  const out: string[] = []
  let [ano, mes] = [Number(deComp.slice(0, 4)), Number(deComp.slice(5, 7))]
  const [anoFim, mesFim] = [Number(ateComp.slice(0, 4)), Number(ateComp.slice(5, 7))]
  // trava de segurança: no máximo 120 meses
  for (let i = 0; i < 120; i++) {
    out.push(`${ano}-${String(mes).padStart(2, '0')}-01`)
    if (ano === anoFim && mes === mesFim) break
    mes++
    if (mes > 12) {
      mes = 1
      ano++
    }
    if (ano > anoFim || (ano === anoFim && mes > mesFim)) break
  }
  return out
}
