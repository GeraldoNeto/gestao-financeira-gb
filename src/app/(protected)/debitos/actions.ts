'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import { parseValorBRL, hojeISO } from '@/lib/format'

export type LancState = { error?: string } | undefined
export type TipoEntidade = 'empresa' | 'pessoa'

export async function criarDebito(_prev: LancState, formData: FormData): Promise<LancState> {
  const tipo: TipoEntidade = formData.get('tipo') === 'pessoa' ? 'pessoa' : 'empresa'
  const idEntidade = Number(formData.get('id_entidade'))
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const data = String(formData.get('data') || hojeISO())
  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim()
    return v === '' ? null : v
  }

  if (!Number.isInteger(idEntidade) || idEntidade <= 0)
    return { error: tipo === 'empresa' ? 'Selecione a empresa.' : 'Selecione a pessoa.' }
  if (valor === null || valor <= 0)
    return { error: 'Informe um valor válido maior que zero (ex.: 1.234,56).' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const usuario = ((user?.user_metadata?.nome as string) || user?.email) ?? null

  const { error } =
    tipo === 'empresa'
      ? await supabase.from('debitos_empresa').insert({
          id_empresa: idEntidade,
          data_debito: data,
          historico: opt('historico'),
          valor,
          observacao: opt('observacao'),
          usuario,
        })
      : await supabase.from('debitos_pessoa').insert({
          id_pessoa: idEntidade,
          data,
          historico: opt('historico'),
          valor,
          usuario,
        })

  if (error) return { error: msgErroDB(error) }

  revalidatePath('/', 'layout')
  redirect(`/debitos?tipo=${tipo}`)
}

export async function excluirDebito(
  tipo: TipoEntidade,
  id: number,
): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const tabela = tipo === 'empresa' ? 'debitos_empresa' : 'debitos_pessoa'
  const { data, error } = await supabase
    .from(tabela)
    .delete()
    .eq('id_debito', id)
    .select('id_debito')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Exclusão permitida apenas para administradores.' }

  revalidatePath('/', 'layout')
}
