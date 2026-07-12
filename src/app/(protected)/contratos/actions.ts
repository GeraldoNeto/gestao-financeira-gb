'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { msgErroDB } from '@/lib/db-errors'
import { parseValorBRL, hojeISO } from '@/lib/format'
import type { StatusRegistro } from '@/lib/database.types'

async function usuarioAtual() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, usuario: ((user?.user_metadata?.nome as string) || user?.email) ?? null }
}

/** Cadastra uma despesa (IPTU, manutenção, seguro…) vinculada a este aluguel.
 *  Vira um gasto de despesas_mes: descontado da divisão no mês da data. */
export async function criarDespesaAluguel(idContrato: number, formData: FormData): Promise<void> {
  const descricao = String(formData.get('descricao') ?? '').trim()
  const data = String(formData.get('data') ?? '').trim()
  const valor = parseValorBRL(String(formData.get('valor') ?? ''))
  const back = `/contratos/${idContrato}`

  if (!descricao || !/^\d{4}-\d{2}-\d{2}$/.test(data) || valor === null || valor <= 0) {
    redirect(`${back}?erro=${encodeURIComponent('Informe a descrição, a data e um valor válido.')}`)
  }

  const { supabase, usuario } = await usuarioAtual()
  const { error } = await supabase.from('despesas_mes').insert({
    id_contrato: idContrato,
    competencia: `${data.slice(0, 7)}-01`,
    data,
    descricao,
    valor,
    usuario,
  })
  if (error) redirect(`${back}?erro=${encodeURIComponent(msgErroDB(error))}`)

  revalidatePath('/', 'layout')
  redirect(back)
}

export async function excluirDespesaAluguel(id: number): Promise<{ error?: string } | void> {
  const { supabase } = await usuarioAtual()
  const { data, error } = await supabase
    .from('despesas_mes')
    .delete()
    .eq('id_despesa', id)
    .select('id_despesa')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Sem permissão para excluir.' }

  revalidatePath('/', 'layout')
}

export type ContratoState = { error?: string } | undefined

type ContratoInput = {
  id_imovel: number
  unidade: string | null
  valor_mensal: number
  dia_vencimento: number
  data_inicio: string
  data_fim: string | null
  status: StatusRegistro
  observacao: string | null
}

function lerCampos(formData: FormData): { erro?: string; dados?: ContratoInput } {
  const idImovel = Number(formData.get('id_imovel'))
  const valor = parseValorBRL(String(formData.get('valor_mensal') ?? ''))
  let dia = Number(formData.get('dia_vencimento'))
  const dataInicio = String(formData.get('data_inicio') || hojeISO())
  const dataFim = String(formData.get('data_fim') ?? '').trim() || null
  const opt = (k: string) => {
    const v = String(formData.get(k) ?? '').trim()
    return v === '' ? null : v
  }

  if (!Number.isInteger(idImovel) || idImovel <= 0) return { erro: 'Selecione o imóvel.' }
  if (valor === null || valor <= 0) return { erro: 'Informe um valor mensal válido.' }
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) dia = 10
  if (dataFim && dataFim < dataInicio)
    return { erro: 'A data final não pode ser anterior à data de início.' }

  return {
    dados: {
      id_imovel: idImovel,
      unidade: opt('unidade'),
      valor_mensal: valor,
      dia_vencimento: dia,
      data_inicio: dataInicio,
      data_fim: dataFim,
      status: (formData.get('status') === 'inativo' ? 'inativo' : 'ativo') as StatusRegistro,
      observacao: opt('observacao'),
    },
  }
}

export async function criarContrato(_prev: ContratoState, formData: FormData): Promise<ContratoState> {
  const { erro, dados } = lerCampos(formData)
  if (erro) return { error: erro }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contratos')
    .insert(dados!)
    .select('id_contrato')
    .single()
  if (error) return { error: msgErroDB(error) }

  // Por padrão todos os irmãos ativos recebem 100% do aluguel novo —
  // o ajuste (ex.: 50%) é feito na página de cada irmão.
  const idContrato = (data as { id_contrato: number }).id_contrato
  const { data: irmaos } = await supabase
    .from('pessoas_fisicas')
    .select('id_pessoa')
    .eq('status', 'ativo')
  const vinculos = ((irmaos as { id_pessoa: number }[] | null) ?? []).map((p) => ({
    id_contrato: idContrato,
    id_pessoa: p.id_pessoa,
    percentual: 100,
  }))
  if (vinculos.length) await supabase.from('contrato_pessoa_percentual').insert(vinculos)

  revalidatePath('/', 'layout')
  redirect(`/imoveis/${dados!.id_imovel}`)
}

export async function atualizarContrato(
  id: number,
  _prev: ContratoState,
  formData: FormData,
): Promise<ContratoState> {
  const { erro, dados } = lerCampos(formData)
  if (erro) return { error: erro }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contratos')
    .update(dados!)
    .eq('id_contrato', id)
    .select('id_contrato')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length) return { error: 'Seu perfil não tem permissão para alterar registros.' }

  revalidatePath('/', 'layout')
  redirect(`/imoveis/${dados!.id_imovel}`)
}

export async function excluirContrato(id: number): Promise<{ error?: string } | void> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contratos')
    .delete()
    .eq('id_contrato', id)
    .select('id_contrato')
  if (error) return { error: msgErroDB(error) }
  if (!data?.length)
    return { error: 'Exclusão permitida apenas para administradores (ou há cobranças vinculadas).' }

  revalidatePath('/', 'layout')
}
