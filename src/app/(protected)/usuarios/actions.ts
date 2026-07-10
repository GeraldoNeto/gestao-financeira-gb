'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import type { PerfilAcesso, StatusRegistro } from '@/lib/database.types'

export type UsuarioState = { error?: string; ok?: boolean } | undefined

const PERFIS: PerfilAcesso[] = ['administrador', 'operador', 'consulta']

export async function alterarUsuario(
  id: string,
  _prev: UsuarioState,
  formData: FormData,
): Promise<UsuarioState> {
  const perfil = String(formData.get('perfil') ?? '')
  const status = String(formData.get('status') ?? '')

  if (!PERFIS.includes(perfil as PerfilAcesso)) return { error: 'Perfil inválido.' }
  const st: StatusRegistro = status === 'inativo' ? 'inativo' : 'ativo'

  const supabase = await createClient()

  // Impede o admin de rebaixar/desativar a si mesmo (evita ficar sem administrador).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.id === id && (perfil !== 'administrador' || st !== 'ativo')) {
    return { error: 'Você não pode remover seu próprio acesso de administrador.' }
  }

  const { data, error } = await supabase
    .from('perfis')
    .update({ perfil: perfil as PerfilAcesso, status: st })
    .eq('id', id)
    .select('id')

  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Apenas administradores podem alterar usuários.' }

  revalidatePath('/usuarios')
  return { ok: true }
}
