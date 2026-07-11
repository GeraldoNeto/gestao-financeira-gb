'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import { parseValorBRL } from '@/lib/format'

async function usuarioAtual() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, usuario: ((user?.user_metadata?.nome as string) || user?.email) ?? null }
}

/** Registra um repasse a um irmão (ex.: boleto quitado) no mês. */
export async function criarPagamento(mes: string, formData: FormData): Promise<void> {
  const idPessoa = Number(formData.get('id_pessoa'))
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))

  if (!Number.isInteger(idPessoa) || idPessoa <= 0 || !descricao || valor === null || valor <= 0) {
    redirect(`/divisao?mes=${mes}&erro=${encodeURIComponent('Selecione o irmão e informe a descrição e um valor válido.')}`)
  }

  const { supabase, usuario } = await usuarioAtual()
  const { error } = await supabase
    .from('pagamentos_irmao')
    .insert({ id_pessoa: idPessoa, competencia: `${mes}-01`, descricao, valor, usuario })
  if (error) redirect(`/divisao?mes=${mes}&erro=${encodeURIComponent(msgErroDB(error))}`)

  revalidatePath('/', 'layout')
  redirect(`/divisao?mes=${mes}`)
}

export async function excluirPagamento(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('pagamentos_irmao')
    .delete()
    .eq('id_pagamento', id)
    .select('id_pagamento')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para excluir.' }

  revalidatePath('/', 'layout')
}

export type PagamentoEditState = { error?: string } | undefined

/** Altera a descrição, o valor ou o irmão de um repasse. */
export async function atualizarPagamento(
  id: number,
  mes: string,
  _prev: PagamentoEditState,
  formData: FormData,
): Promise<PagamentoEditState> {
  const idPessoa = Number(formData.get('id_pessoa'))
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))

  if (!Number.isInteger(idPessoa) || idPessoa <= 0) return { error: 'Selecione o irmão.' }
  if (!descricao) return { error: 'Informe a descrição.' }
  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }

  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('pagamentos_irmao')
    .update({ id_pessoa: idPessoa, descricao, valor })
    .eq('id_pagamento', id)
    .select('id_pagamento')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para alterar.' }

  revalidatePath('/', 'layout')
  redirect(`/divisao?mes=${mes}`)
}
