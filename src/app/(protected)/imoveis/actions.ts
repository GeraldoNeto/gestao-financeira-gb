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
    endereco: opt('endereco'),
    observacao: opt('observacao'),
    status: (formData.get('status') === 'inativo' ? 'inativo' : 'ativo') as StatusRegistro,
  }
}

export async function criarImovel(_prev: CadState, formData: FormData): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome) return { error: 'O nome/identificação do imóvel é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase.from('imoveis').insert(campos)
  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect('/imoveis')
}

export async function atualizarImovel(
  id: number,
  _prev: CadState,
  formData: FormData,
): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome) return { error: 'O nome/identificação do imóvel é obrigatório.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('imoveis')
    .update(campos)
    .eq('id_imovel', id)
    .select('id_imovel')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Seu perfil não tem permissão para alterar registros.' }

  revalidatePath('/', 'layout')
  redirect('/imoveis')
}

export async function excluirImovel(id: number): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('imoveis')
    .delete()
    .eq('id_imovel', id)
    .select('id_imovel')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
}
