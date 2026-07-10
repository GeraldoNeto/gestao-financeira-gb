'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import { parseValorBRL, hojeISO } from '@/lib/format'

export type RateioState = { error?: string } | undefined

export async function executarRateio(
  _prev: RateioState,
  formData: FormData,
): Promise<RateioState> {
  const idEmpresa = Number(formData.get('id_empresa'))
  const valorTotal = parseValorBRL(String(formData.get('valor_total') ?? ''))
  const pessoas = formData.getAll('pessoas').map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0)
  const data = String(formData.get('data') || hojeISO())
  const historico = String(formData.get('historico') ?? '').trim() || 'Rateio de crédito da empresa'
  const idCreditoRaw = Number(formData.get('id_credito_empresa'))
  const idCredito = Number.isInteger(idCreditoRaw) && idCreditoRaw > 0 ? idCreditoRaw : null

  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) return { error: 'Selecione a empresa.' }
  if (valorTotal === null || valorTotal <= 0)
    return { error: 'Informe um valor total válido maior que zero.' }
  if (pessoas.length === 0) return { error: 'Selecione ao menos uma pessoa participante.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const usuario = ((user?.user_metadata?.nome as string) || user?.email) ?? null

  const { data: idRateio, error } = await supabase.rpc('fn_executar_rateio', {
    p_id_empresa: idEmpresa,
    p_valor_total: valorTotal,
    p_pessoas: pessoas,
    p_id_credito_empresa: idCredito ?? undefined,
    p_historico: historico,
    p_usuario: usuario ?? undefined,
    p_data: data,
  })

  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect(`/rateio/${idRateio}`)
}

export async function excluirRateio(id: number): Promise<{ error?: string } | void> {
  const supabase = await createClient()

  // Desfaz o rateio: primeiro remove os créditos gerados, depois o cabeçalho.
  const { error: errCred } = await supabase
    .from('creditos_pessoa')
    .delete()
    .eq('origem_rateio', id)
  if (errCred) return { error: msgErroDB(errCred) }

  const { data, error } = await supabase
    .from('rateios')
    .delete()
    .eq('id_rateio', id)
    .select('id_rateio')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
  redirect('/rateio')
}
