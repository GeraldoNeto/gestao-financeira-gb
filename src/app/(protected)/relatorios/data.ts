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
  { id: 'prestacao', label: 'Prestação de contas (recebidos, despesas e rateio)' },
  { id: 'alugueis', label: 'Aluguéis (cobranças do período)' },
  { id: 'divisao', label: 'Divisão entre os irmãos (recebido)' },
  { id: 'gastos', label: 'Gastos do mês (despesas)' },
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
    case 'prestacao':
      return relPrestacao(supabase, de, ate)
    case 'alugueis':
      return relAlugueis(supabase, de, ate)
    case 'divisao':
      return relDivisao(supabase, de, ate)
    case 'gastos':
      return relGastos(supabase, de, ate)
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

// ---------------------- Prestação de contas ----------------------

export type PrestacaoRecebido = {
  competencia: string
  imovel: string
  unidade: string | null
  vencimento: string
  data_pagamento: string | null
  observacao: string | null
  valor: number
}
export type PrestacaoDespesa = {
  competencia: string
  descricao: string
  data_lancamento: string
  valor: number
}
export type PrestacaoIrmao = {
  nome: string
  recebido: number
  despesa_rateada: number
  liquido: number
}
export type DadosPrestacao = {
  de?: string
  ate?: string
  recebidos: PrestacaoRecebido[]
  despesas: PrestacaoDespesa[]
  irmaos: PrestacaoIrmao[]
  totalRecebido: number
  totalDespesas: number
  liquido: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Reúne, para o período (competência), tudo o que a prestação de contas precisa:
 * aluguéis recebidos, despesas e o rateio do líquido entre os irmãos.
 * A despesa é descontada de cada irmão proporcionalmente ao que ele recebeu.
 */
export async function dadosPrestacao(supabase: DB, de?: string, ate?: string): Promise<DadosPrestacao> {
  let qCob = supabase
    .from('vw_cobrancas')
    .select('competencia, nome_imovel, unidade, vencimento, data_pagamento, observacao, valor')
    .eq('status', 'pago')
    .order('competencia')
    .order('nome_imovel')
  let qDesp = supabase
    .from('despesas_mes')
    .select('competencia, descricao, data_lancamento, valor')
    .order('competencia')
    .order('id_despesa')
  let qDiv = supabase
    .from('vw_divisao_alugueis')
    .select('id_pessoa, nome_irmao, valor_irmao')
  if (de) {
    qCob = qCob.gte('competencia', de)
    qDesp = qDesp.gte('competencia', de)
    qDiv = qDiv.gte('competencia', de)
  }
  if (ate) {
    qCob = qCob.lte('competencia', ate)
    qDesp = qDesp.lte('competencia', ate)
    qDiv = qDiv.lte('competencia', ate)
  }

  const [{ data: cob }, { data: desp }, { data: div }] = await Promise.all([qCob, qDesp, qDiv])

  const recebidos = ((cob as PrestacaoRecebido[] | null) ?? []).map((r) => ({
    ...r,
    valor: Number(r.valor),
  }))
  const despesas = ((desp as PrestacaoDespesa[] | null) ?? []).map((d) => ({
    ...d,
    valor: Number(d.valor),
  }))

  const totalRecebido = recebidos.reduce((s, r) => s + r.valor, 0)
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0)
  const liquido = round2(totalRecebido - totalDespesas)

  // Recebido por irmão (soma das partes de cada aluguel pago no período)
  const porIrmao = new Map<number, { nome: string; recebido: number }>()
  for (const l of (div as { id_pessoa: number; nome_irmao: string; valor_irmao: number }[] | null) ??
    []) {
    const a = porIrmao.get(l.id_pessoa) ?? { nome: l.nome_irmao, recebido: 0 }
    a.recebido += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, a)
  }

  const irmaos: PrestacaoIrmao[] = [...porIrmao.values()]
    .map((i) => {
      const despesaRateada =
        totalRecebido > 0 ? round2(totalDespesas * (i.recebido / totalRecebido)) : 0
      return {
        nome: i.nome,
        recebido: round2(i.recebido),
        despesa_rateada: despesaRateada,
        liquido: round2(i.recebido - despesaRateada),
      }
    })
    .sort((a, b) => b.recebido - a.recebido)

  return { de, ate, recebidos, despesas, irmaos, totalRecebido, totalDespesas, liquido }
}

async function relPrestacao(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  const d = await dadosPrestacao(supabase, de, ate)
  const linhas: Record<string, unknown>[] = d.irmaos.map((i) => ({
    nome: i.nome,
    recebido: i.recebido,
    despesa_rateada: i.despesa_rateada,
    liquido: i.liquido,
  }))
  linhas.push({
    nome: 'TOTAL',
    recebido: d.totalRecebido,
    despesa_rateada: d.totalDespesas,
    liquido: d.liquido,
  })
  return {
    titulo: 'Prestação de contas — rateio entre os irmãos',
    usaPeriodo: true,
    colunas: [
      T('nome', 'Irmão'),
      M('recebido', 'Recebido'),
      M('despesa_rateada', 'Despesas (rateio)'),
      M('liquido', 'Líquido a receber'),
    ],
    linhas,
  }
}

async function relAlugueis(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  let q = supabase
    .from('vw_cobrancas')
    .select('*')
    .order('competencia', { ascending: false })
    .order('nome_imovel')
  if (de) q = q.gte('competencia', de)
  if (ate) q = q.lte('competencia', ate)
  const { data } = await q
  const linhas = (((data ?? []) as Record<string, unknown>[])).map((r) => ({
    competencia: r.competencia,
    imovel: r.nome_imovel,
    aluguel: r.unidade ?? '—',
    vencimento: r.vencimento,
    valor: r.valor,
    situacao: r.situacao,
    pago_em: r.data_pagamento,
  }))
  return {
    titulo: 'Aluguéis (cobranças do período)',
    usaPeriodo: true,
    colunas: [
      D('competencia', 'Mês'),
      T('imovel', 'Imóvel'),
      T('aluguel', 'Aluguel'),
      D('vencimento', 'Vencimento'),
      M('valor', 'Valor'),
      T('situacao', 'Situação'),
      D('pago_em', 'Pago em'),
    ],
    linhas,
  }
}

async function relDivisao(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  let q = supabase
    .from('vw_divisao_alugueis')
    .select('*')
    .order('competencia', { ascending: false })
    .order('nome_irmao')
  if (de) q = q.gte('competencia', de)
  if (ate) q = q.lte('competencia', ate)
  const { data } = await q
  return {
    titulo: 'Divisão entre os irmãos (recebido)',
    usaPeriodo: true,
    colunas: [
      D('competencia', 'Mês'),
      T('nome_imovel', 'Imóvel'),
      T('nome_irmao', 'Irmão'),
      N('percentual', 'Peso (%)'),
      M('valor_recebido', 'Aluguel recebido'),
      M('valor_irmao', 'Parte do irmão'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
  }
}

async function relGastos(supabase: DB, de?: string, ate?: string): Promise<Relatorio> {
  let q = supabase
    .from('despesas_mes')
    .select('*')
    .order('competencia', { ascending: false })
    .order('id_despesa')
  if (de) q = q.gte('competencia', de)
  if (ate) q = q.lte('competencia', ate)
  const { data } = await q
  return {
    titulo: 'Gastos do mês (despesas)',
    usaPeriodo: true,
    colunas: [
      D('competencia', 'Mês'),
      T('descricao', 'Descrição'),
      T('usuario', 'Usuário'),
      M('valor', 'Valor'),
    ],
    linhas: (data ?? []) as Record<string, unknown>[],
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
