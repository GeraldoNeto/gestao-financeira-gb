'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import { parseValorBRL, hojeISO, mesAtual } from '@/lib/format'

async function usuarioAtual() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, usuario: ((user?.user_metadata?.nome as string) || user?.email) ?? null }
}

/** Gera as cobranças do mês (competência = YYYY-MM) para os contratos ativos. */
export async function gerarCobrancas(formData: FormData) {
  const mes = String(formData.get('mes') || mesAtual())
  const { supabase, usuario } = await usuarioAtual()

  const { data, error } = await supabase.rpc('fn_gerar_cobrancas', {
    p_competencia: `${mes}-01`,
    p_usuario: usuario ?? undefined,
  })

  revalidatePath('/cobrancas')
  if (error) redirect(`/cobrancas?mes=${mes}&erro=${encodeURIComponent(msgErroDB(error))}`)
  redirect(`/cobrancas?mes=${mes}&geradas=${data ?? 0}`)
}

/** Marca a cobrança como paga (data de hoje, valor igual ao cobrado). */
export async function darBaixa(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data: cob } = await supabase
    .from('cobrancas')
    .select('valor')
    .eq('id_cobranca', id)
    .single()

  const { data, error } = await supabase
    .from('cobrancas')
    .update({ status: 'pago', data_pagamento: hojeISO(), valor_pago: cob?.valor ?? null })
    .eq('id_cobranca', id)
    .select('id_cobranca')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para dar baixa.' }

  revalidatePath('/cobrancas')
}

/** Estorna a baixa: volta a cobrança para pendente. */
export async function estornar(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('cobrancas')
    .update({ status: 'pendente', data_pagamento: null, valor_pago: null })
    .eq('id_cobranca', id)
    .select('id_cobranca')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para estornar.' }

  revalidatePath('/cobrancas')
}

export async function excluirCobranca(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('cobrancas')
    .delete()
    .eq('id_cobranca', id)
    .select('id_cobranca')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para excluir.' }

  revalidatePath('/cobrancas')
}

function lerContrato(formData: FormData): number | null {
  const v = Number(formData.get('id_contrato'))
  return Number.isInteger(v) && v > 0 ? v : null
}

/** Lança um gasto do mês (descontado antes da divisão; geral ou de um aluguel). */
export async function criarDespesa(mes: string, formData: FormData): Promise<void> {
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const idContrato = lerContrato(formData)

  if (!descricao || valor === null || valor <= 0) {
    redirect(`/cobrancas?mes=${mes}&erro=${encodeURIComponent('Informe a descrição e um valor válido para o gasto.')}`)
  }

  const { supabase, usuario } = await usuarioAtual()
  const { error } = await supabase
    .from('despesas_mes')
    .insert({ competencia: `${mes}-01`, descricao, valor, id_contrato: idContrato, usuario })
  if (error) redirect(`/cobrancas?mes=${mes}&erro=${encodeURIComponent(msgErroDB(error))}`)

  revalidatePath('/', 'layout')
  redirect(`/cobrancas?mes=${mes}`)
}

export type DespesaEditState = { error?: string } | undefined

/** Altera a descrição e o valor de um gasto do mês. */
export async function atualizarDespesa(
  id: number,
  mes: string,
  _prev: DespesaEditState,
  formData: FormData,
): Promise<DespesaEditState> {
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const idContrato = lerContrato(formData)

  if (!descricao) return { error: 'Informe a descrição do gasto.' }
  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }

  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('despesas_mes')
    .update({ descricao, valor, id_contrato: idContrato })
    .eq('id_despesa', id)
    .select('id_despesa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para alterar.' }

  revalidatePath('/', 'layout')
  redirect(`/cobrancas?mes=${mes}`)
}

export async function excluirDespesa(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('despesas_mes')
    .delete()
    .eq('id_despesa', id)
    .select('id_despesa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para excluir.' }

  revalidatePath('/', 'layout')
}

export type CobrancaEditState = { error?: string } | undefined

/** Edita valor, vencimento e observação de uma cobrança. */
export async function atualizarCobranca(
  id: number,
  mes: string,
  _prev: CobrancaEditState,
  formData: FormData,
): Promise<CobrancaEditState> {
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const vencimento = String(formData.get('vencimento') ?? '').trim()
  const obs = String(formData.get('observacao') ?? '').trim() || null

  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }
  if (!vencimento) return { error: 'Informe o vencimento.' }

  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('cobrancas')
    .update({ valor, vencimento, observacao: obs })
    .eq('id_cobranca', id)
    .select('id_cobranca')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para alterar.' }

  revalidatePath('/cobrancas')
  redirect(`/cobrancas?mes=${mes}`)
}
