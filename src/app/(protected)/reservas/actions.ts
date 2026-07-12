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

export type ReservaState = { error?: string } | undefined

/** Cria a reserva e o crédito inicial. */
export async function criarReserva(_prev: ReservaState, formData: FormData): Promise<ReservaState> {
  const idEmpresa = Number(formData.get('id_empresa'))
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))

  if (!Number.isInteger(idEmpresa) || idEmpresa <= 0) return { error: 'Selecione a empresa.' }
  if (!descricao) return { error: 'Informe a descrição (finalidade) da reserva.' }
  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }

  const { supabase, usuario } = await usuarioAtual()
  const { data, error } = await supabase.rpc('fn_criar_reserva', {
    p_id_empresa: idEmpresa,
    p_descricao: descricao,
    p_valor: valor,
    p_usuario: usuario ?? undefined,
  })
  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect(`/reservas/${data as number}`)
}

export type MovState = { error?: string } | undefined

/** Registra um crédito ou débito na reserva. */
export async function registrarMovimento(
  idReserva: number,
  _prev: MovState,
  formData: FormData,
): Promise<MovState> {
  const tipo = formData.get('tipo') === 'CREDITO' ? 'CREDITO' : 'DEBITO'
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const permitirNegativo = formData.get('permitir_negativo') === 'on'

  if (!descricao) return { error: 'Informe a descrição da movimentação.' }
  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }

  const { supabase, usuario } = await usuarioAtual()
  const { error } = await supabase.rpc('fn_reserva_movimento', {
    p_id_reserva: idReserva,
    p_tipo: tipo,
    p_descricao: descricao,
    p_valor: valor,
    p_usuario: usuario ?? undefined,
    p_permitir_negativo: permitirNegativo,
  })
  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect(`/reservas/${idReserva}`)
}

/** Encerra ou reabre a reserva (usada como action de formulário). */
export async function alterarStatusReserva(idReserva: number, encerrar: boolean): Promise<void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('reservas')
    .update({ status: encerrar ? 'encerrada' : 'ativa' })
    .eq('id_reserva', idReserva)
    .select('id_reserva')
  if (error) redirect(`/reservas/${idReserva}?erro=${encodeURIComponent(msgErroDB(error))}`)
  if (!data?.length) redirect(`/reservas/${idReserva}?erro=${encodeURIComponent('Sem permissão para alterar a reserva.')}`)

  revalidatePath('/', 'layout')
}

/** Exclui um lançamento do histórico e recalcula os saldos da reserva. */
export async function excluirMovimento(idMovimento: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data: mov } = await supabase
    .from('reserva_movimentos')
    .select('id_reserva')
    .eq('id_movimento', idMovimento)
    .single()
  if (!mov) return { error: 'Movimentação não encontrada.' }

  const del = await supabase
    .from('reserva_movimentos')
    .delete()
    .eq('id_movimento', idMovimento)
    .select('id_movimento')
  if (del.error) return { error: msgErroDB(del.error) }
  if (!del.data?.length) return { error: 'Sem permissão para excluir.' }

  const rec = await supabase.rpc('fn_reserva_recalcular', { p_id_reserva: mov.id_reserva })
  if (rec.error) return { error: msgErroDB(rec.error) }

  revalidatePath('/', 'layout')
}

export type MovEditState = { error?: string } | undefined

/** Edita um lançamento do histórico e recalcula os saldos da reserva. */
export async function atualizarMovimento(
  idMovimento: number,
  idReserva: number,
  _prev: MovEditState,
  formData: FormData,
): Promise<MovEditState> {
  const tipo = formData.get('tipo') === 'CREDITO' ? 'CREDITO' : 'DEBITO'
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))

  if (!descricao) return { error: 'Informe a descrição.' }
  if (valor === null || valor <= 0) return { error: 'Informe um valor válido.' }

  const { supabase } = await usuarioAtual()
  const upd = await supabase
    .from('reserva_movimentos')
    .update({ tipo, descricao, valor })
    .eq('id_movimento', idMovimento)
    .select('id_movimento')
  if (upd.error) return { error: msgErroDB(upd.error) }
  if (!upd.data?.length) return { error: 'Sem permissão para alterar.' }

  const rec = await supabase.rpc('fn_reserva_recalcular', { p_id_reserva: idReserva })
  if (rec.error) return { error: msgErroDB(rec.error) }

  revalidatePath('/', 'layout')
  redirect(`/reservas/${idReserva}`)
}

export async function excluirReserva(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase.from('reservas').delete().eq('id_reserva', id).select('id_reserva')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
  redirect('/reservas')
}
