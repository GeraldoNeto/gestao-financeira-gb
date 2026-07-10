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
