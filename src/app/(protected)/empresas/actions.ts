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
    nome_empresa: String(formData.get('nome_empresa') ?? '').trim(),
    cnpj: opt('cnpj'),
    endereco: opt('endereco'),
    telefone: opt('telefone'),
    email: opt('email'),
    status: (formData.get('status') === 'inativo' ? 'inativo' : 'ativo') as StatusRegistro,
  }
}

export async function criarEmpresa(_prev: CadState, formData: FormData): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome_empresa) return { error: 'O nome da empresa é obrigatório.' }

  const supabase = await createClient()
  const { error } = await supabase.from('empresas').insert(campos)
  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect('/empresas')
}

export async function atualizarEmpresa(
  id: number,
  _prev: CadState,
  formData: FormData,
): Promise<CadState> {
  const campos = lerCampos(formData)
  if (!campos.nome_empresa) return { error: 'O nome da empresa é obrigatório.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('empresas')
    .update(campos)
    .eq('id_empresa', id)
    .select('id_empresa')
  if (error) return { error: msgErroDB(error) }
  // RLS filtra silenciosamente: 0 linhas afetadas = sem permissão
  if (!data?.length) return { error: 'Seu perfil não tem permissão para alterar registros.' }

  revalidatePath('/', 'layout')
  redirect('/empresas')
}

export type PctState = { error?: string; ok?: boolean } | undefined

/**
 * Salva os percentuais de recebimento das pessoas para esta empresa.
 * Estratégia: substitui todos os vínculos da empresa (apaga e reinsere os != 100).
 * Campos do form: pct_<id_pessoa> = percentual.
 */
export async function salvarPercentuais(
  idEmpresa: number,
  _prev: PctState,
  formData: FormData,
): Promise<PctState> {
  const rows: { id_empresa: number; id_pessoa: number; percentual: number }[] = []
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith('pct_')) continue
    const idPessoa = Number(k.slice(4))
    if (!Number.isInteger(idPessoa)) continue
    let p = Number(String(v).replace(',', '.'))
    if (!Number.isFinite(p)) p = 100
    p = Math.min(100, Math.max(0, Math.round(p * 100) / 100))
    if (p !== 100) rows.push({ id_empresa: idEmpresa, id_pessoa: idPessoa, percentual: p })
  }

  const supabase = await createClient()
  const del = await supabase.from('empresa_pessoa_percentual').delete().eq('id_empresa', idEmpresa)
  if (del.error) return { error: msgErroDB(del.error) }
  if (rows.length) {
    const ins = await supabase.from('empresa_pessoa_percentual').insert(rows)
    if (ins.error) return { error: msgErroDB(ins.error) }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function excluirEmpresa(id: number): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('empresas')
    .delete()
    .eq('id_empresa', id)
    .select('id_empresa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
}
