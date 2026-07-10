import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { brl, dataBR } from '@/lib/format'

type DB = SupabaseClient<Database>

export type ColTipo = 'money' | 'date' | 'number' | 'text'
export type Coluna = { key: string; label: string; tipo: ColTipo }
export type Relatorio = {
  titulo: string
  colunas: Coluna[]
  linhas: Record<string, unknown>[]
  usaPeriodo: boolean
}

/** Catálogo de relatórios disponíveis (Módulo 9). */
export const RELATORIOS = [
  { id: 'empresas', label: 'Empresas cadastradas' },
  { id: 'pessoas', label: 'Pessoas físicas cadastradas' },
  { id: 'creditos', label: 'Créditos (todos)' },
  { id: 'debitos', label: 'Débitos (todos)' },
  { id: 'rateios', label: 'Rateios realizados' },
  { id: 'diferencas', label: 'Diferenças de arredondamento' },
  { id: 'resumo', label: 'Resumo geral' },
] as const

export type RelatorioId = (typeof RELATORIOS)[number]['id']

export function isRelatorioId(v: string): v is RelatorioId {
  return RELATORIOS.some((r) => r.id === v)
}

/** Formata uma célula para exibição/PDF conforme o tipo da coluna. */
export function fmtCell(value: unknown, tipo: ColTipo): string {
  if (value === null || value === undefined || value === '')
    return tipo === 'money' ? brl(0) : '—'
  switch (tipo) {
    case 'money':
      return brl(Number(value))
    case 'date':
      return dataBR(String(value))
    default:
      return String(value)
  }
}

const M = (key: string, label: string): Coluna => ({ key, label, tipo: 'money' })
const T = (key: string, label: string): Coluna => ({ key, label, tipo: 'text' })
const D = (key: string, label: string): Coluna => ({ key, label, tipo: 'date' })
const N = (key: string, label: string): Coluna => ({ key, label, tipo: 'number' })

export async function buildRelatorio(
  supabase: DB,
  tipo: RelatorioId,
  de?: string,
  ate?: string,
): Promise<Relatorio> {
  switch (tipo) {
    case 'empresas':
      return relEmpresas(supabase)
    case 'pessoas':
      return relPessoas(supabase)
    case 'creditos':
      return relLancamentos(supabase, 'CREDITO', de, ate)
    case 'debitos':
      return relLancamentos(supabase, 'DEBITO', de, ate)
    case 'rateios':
      return relRateios(supabase, de, ate)
    case 'diferencas':
      return relDiferencas(supabase, de, ate)
    case 'resumo':
      return relResumo(supabase)
  }
}

async function relEmpresas(supabase: DB): Promise<Relatorio> {
  const { data } = await supabase.from('vw_saldo_empresa').select('*').order('nome_empresa')
  return {
    titulo: 'Empresas cadastradas',
    usaPeriodo: false,
    colunas: [
      T('nome_empresa', 'Empresa'),
      T('status', 'Status'),
      M('total_creditos', 'Créditos'),
      M('total_debitos', 'Débitos'),
      M('saldo', 'Saldo'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
  }
}

async function relPessoas(supabase: DB): Promise<Relatorio> {
  const { data } = await supabase.from('vw_saldo_pessoa').select('*').order('nome')
  return {
    titulo: 'Pessoas físicas cadastradas',
    usaPeriodo: false,
    colunas: [
      T('nome', 'Nome'),
      T('status', 'Status'),
      M('total_creditos', 'Créditos'),
      M('total_debitos', 'Débitos'),
      M('saldo', 'Saldo'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
  }
}

async function relLancamentos(
  supabase: DB,
  tipo: 'CREDITO' | 'DEBITO',
  de?: string,
  ate?: string,
): Promise<Relatorio> {
  const tblEmp = tipo === 'CREDITO' ? 'creditos_empresa' : 'debitos_empresa'
  const tblPes = tipo === 'CREDITO' ? 'creditos_pessoa' : 'debitos_pessoa'
  const colDataEmp = tipo === 'CREDITO' ? 'data_credito' : 'data_debito'

  let qEmp = supabase.from(tblEmp).select('*')
  let qPes = supabase.from(tblPes).select('*')
  if (de) {
    qEmp = qEmp.gte(colDataEmp, de)
    qPes = qPes.gte('data', de)
  }
  if (ate) {
    qEmp = qEmp.lte(colDataEmp, ate)
    qPes = qPes.lte('data', ate)
  }

  const [empRes, pesRes, empNomes, pesNomes] = await Promise.all([
    qEmp,
    qPes,
    supabase.from('empresas').select('id_empresa, nome_empresa'),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome'),
  ])

  const nomeEmp = new Map(
    ((empNomes.data ?? []) as { id_empresa: number; nome_empresa: string }[]).map((e) => [
      e.id_empresa,
      e.nome_empresa,
    ]),
  )
  const nomePes = new Map(
    ((pesNomes.data ?? []) as { id_pessoa: number; nome: string }[]).map((p) => [
      p.id_pessoa,
      p.nome,
    ]),
  )

  const linhas: Record<string, unknown>[] = []
  for (const r of (empRes.data ?? []) as Record<string, unknown>[]) {
    linhas.push({
      data: r[colDataEmp],
      origem: 'Empresa',
      nome: nomeEmp.get(r.id_empresa as number) ?? `#${r.id_empresa}`,
      historico: r.historico ?? '',
      valor: r.valor,
      usuario: r.usuario ?? '',
    })
  }
  for (const r of (pesRes.data ?? []) as Record<string, unknown>[]) {
    linhas.push({
      data: r.data,
      origem: 'Pessoa',
      nome: nomePes.get(r.id_pessoa as number) ?? `#${r.id_pessoa}`,
      historico: r.historico ?? '',
      valor: r.valor,
      usuario: r.usuario ?? '',
    })
  }
  linhas.sort((a, b) => String(b.data).localeCompare(String(a.data)))

  return {
    titulo: tipo === 'CREDITO' ? 'Créditos' : 'Débitos',
    usaPeriodo: true,
    colunas: [
      D('data', 'Data'),
      T('origem', 'Origem'),
      T('nome', 'Nome'),
      T('historico', 'Histórico'),
      T('usuario', 'Usuário'),
      M('valor', 'Valor'),
    ],
    linhas,
  }
}

async function relRateios(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  let q = supabase.from('vw_rateios').select('*').order('id_rateio', { ascending: false })
  if (de) q = q.gte('data', de)
  if (ate) q = q.lte('data', ate)
  const { data } = await q
  return {
    titulo: 'Rateios realizados',
    usaPeriodo: true,
    colunas: [
      D('data', 'Data'),
      T('nome_empresa', 'Empresa'),
      M('valor_total', 'Valor total'),
      N('num_pessoas', 'Pessoas'),
      M('valor_individual', 'Valor/cota'),
      M('valor_residual', 'Resíduo'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
  }
}

async function relDiferencas(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  let q = supabase
    .from('vw_rateios')
    .select('*')
    .neq('valor_residual', 0)
    .order('id_rateio', { ascending: false })
  if (de) q = q.gte('data', de)
  if (ate) q = q.lte('data', ate)
  const { data } = await q
  return {
    titulo: 'Diferenças de arredondamento',
    usaPeriodo: true,
    colunas: [
      D('data', 'Data'),
      T('nome_empresa', 'Empresa'),
      M('valor_total', 'Valor total'),
      N('num_pessoas', 'Pessoas'),
      M('valor_residual', 'Resíduo'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
  }
}

async function relResumo(supabase: DB): Promise<Relatorio> {
  const { data } = await supabase.from('vw_dashboard').select('*').single()
  const d = (data ?? {}) as Record<string, number>
  const m = (indicador: string, valor: number) => ({ indicador, valor: brl(valor) })
  const c = (indicador: string, valor: number) => ({ indicador, valor: String(valor) })
  return {
    titulo: 'Resumo geral',
    usaPeriodo: false,
    colunas: [T('indicador', 'Indicador'), T('valor', 'Valor')],
    linhas: [
      c('Empresas cadastradas', d.empresas_total ?? 0),
      m('Créditos de empresas', d.empresas_creditos ?? 0),
      m('Débitos de empresas', d.empresas_debitos ?? 0),
      m('Saldo das empresas', d.empresas_saldo ?? 0),
      c('Pessoas cadastradas', d.pessoas_total ?? 0),
      m('Créditos de pessoas', d.pessoas_creditos ?? 0),
      m('Débitos de pessoas', d.pessoas_debitos ?? 0),
      m('Saldo das pessoas', d.pessoas_saldo ?? 0),
      m('Total recebido', d.total_recebido ?? 0),
      m('Total distribuído', d.total_distribuido ?? 0),
      m('Total debitado', d.total_debitado ?? 0),
      m('Diferença pendente', d.diferenca_pendente ?? 0),
    ],
  }
}
