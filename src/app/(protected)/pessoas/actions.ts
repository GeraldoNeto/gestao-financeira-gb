'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import type { StatusRegistro } from '@/lib/database.types'

export type CadState = { error?: string } | undefined

function lerCampos(formData: FormData) {
  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim()
    return v === '' ? null : v
  }
  return {
    nome: String(formData.get('nome') ?? '').trim(),
    cpf: opt('cpf'),
    telefone: opt('telefone'),
    email: opt('email'),
    conta_bancaria: opt('conta_bancaria'),
    status: (formData.get('status') === 'inativo' ? 'inativo' : 'ativo') as StatusRegistro,
  }
}

export async function criarPessoa(_prev: CadState, formData: FormData): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome) return { error: 'O nome é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase.from('pessoas_fisicas').insert(campos)
  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect('/pessoas')
}

export async function atualizarPessoa(
  id: number,
  _prev: CadState,
  formData: FormData,
): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome) return { error: 'O nome é obrigatório.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pessoas_fisicas')
    .update(campos)
    .eq('id_pessoa', id)
    .select('id_pessoa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Seu perfil não tem permissão para alterar registros.' }

  revalidatePath('/', 'layout')
  redirect('/pessoas')
}

export type PctState = { error?: string; ok?: boolean } | undefined

/**
 * Salva, pelo lado do irmão, o peso (%) que ele recebe de cada imóvel.
 * Substitui os vínculos deste irmão (apaga e reinsere os com peso > 0).
 * Campos do form: pct_<id_imovel> = peso.
 */
export async function salvarAlugueisIrmao(
  idPessoa: number,
  _prev: PctState,
  formData: FormData,
): Promise<PctState> {
  const rows: { id_imovel: number; id_pessoa: number; percentual: number }[] = []
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith('pct_')) continue
    const idImovel = Number(k.slice(4))
    if (!Number.isInteger(idImovel)) continue
    let p = Number(String(v).replace(',', '.'))
    if (!Number.isFinite(p)) p = 0
    p = Math.min(100, Math.max(0, Math.round(p * 100) / 100))
    if (p > 0) rows.push({ id_imovel: idImovel, id_pessoa: idPessoa, percentual: p })
  }

  const supabase = await createClient()
  const del = await supabase.from('imovel_pessoa_percentual').delete().eq('id_pessoa', idPessoa)
  if (del.error) return { error: msgErroDB(del.error) }
  if (rows.length) {
    const ins = await supabase.from('imovel_pessoa_percentual').insert(rows)
    if (ins.error) return { error: msgErroDB(ins.error) }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function excluirPessoa(id: number): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pessoas_fisicas')
    .delete()
    .eq('id_pessoa', id)
    .select('id_pessoa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
}
