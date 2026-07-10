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

export type PctState = { error?: string; ok?: boolean } | undefined

/**
 * Salva a divisão do aluguel deste imóvel entre os irmãos.
 * Substitui os vínculos do imóvel (apaga e reinsere os com percentual > 0).
 * Campos do form: pct_<id_pessoa> = percentual.
 */
export async function salvarPercentuaisImovel(
  idImovel: number,
  _prev: PctState,
  formData: FormData,
): Promise<PctState> {
  const rows: { id_imovel: number; id_pessoa: number; percentual: number }[] = []
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith('pct_')) continue
    const idPessoa = Number(k.slice(4))
    if (!Number.isInteger(idPessoa)) continue
    let p = Number(String(v).replace(',', '.'))
    if (!Number.isFinite(p)) p = 0
    p = Math.min(100, Math.max(0, Math.round(p * 100) / 100))
    if (p > 0) rows.push({ id_imovel: idImovel, id_pessoa: idPessoa, percentual: p })
  }

  const supabase = await createClient()
  const del = await supabase.from('imovel_pessoa_percentual').delete().eq('id_imovel', idImovel)
  if (del.error) return { error: msgErroDB(del.error) }
  if (rows.length) {
    const ins = await supabase.from('imovel_pessoa_percentual').insert(rows)
    if (ins.error) return { error: msgErroDB(ins.error) }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
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
