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

const round2 = (n: number) => Math.round(n * 100) / 100

/** Lê e valida os campos da operação. Retorna erro ou os dados prontos. */
function lerCampos(formData: FormData) {
  const idOrigem = Number(formData.get('id_origem'))
  const idDestino = Number(formData.get('id_destino'))
  const descricao = String(formData.get('descricao') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))

  if (!Number.isInteger(idOrigem) || idOrigem <= 0) return { erro: 'Selecione quem pagou/adiantou.' }
  if (!Number.isInteger(idDestino) || idDestino <= 0) return { erro: 'Selecione a favor de quem.' }
  if (idOrigem === idDestino) return { erro: 'Os dois irmãos devem ser diferentes.' }
  if (!descricao) return { erro: 'Informe a descrição da operação.' }
  if (valor === null || valor <= 0) return { erro: 'Informe um valor válido.' }

  const v = round2(valor)
  return {
    dados: {
      id_origem: idOrigem,
      id_destino: idDestino,
      descricao,
      moeda: 'BRL',
      cotacao: 1,
      valor_moeda: v,
      valor_brl: v,
    },
  }
}

export async function criarConta(mes: string, formData: FormData): Promise<void> {
  const { erro, dados } = lerCampos(formData)
  if (erro) redirect(`/contas?mes=${mes}&erro=${encodeURIComponent(erro)}`)

  const { supabase, usuario } = await usuarioAtual()
  const { error } = await supabase
    .from('contas_irmaos')
    .insert({ ...dados!, competencia: `${mes}-01`, usuario })
  if (error) redirect(`/contas?mes=${mes}&erro=${encodeURIComponent(msgErroDB(error))}`)

  revalidatePath('/', 'layout')
  redirect(`/contas?mes=${mes}`)
}

export async function excluirConta(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('contas_irmaos')
    .delete()
    .eq('id_conta', id)
    .select('id_conta')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para excluir.' }

  revalidatePath('/', 'layout')
}

export type ContaEditState = { error?: string } | undefined

export async function atualizarConta(
  id: number,
  mes: string,
  _prev: ContaEditState,
  formData: FormData,
): Promise<ContaEditState> {
  const { erro, dados } = lerCampos(formData)
  if (erro) return { error: erro }

  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('contas_irmaos')
    .update(dados!)
    .eq('id_conta', id)
    .select('id_conta')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para alterar.' }

  revalidatePath('/', 'layout')
  redirect(`/contas?mes=${mes}`)
}
