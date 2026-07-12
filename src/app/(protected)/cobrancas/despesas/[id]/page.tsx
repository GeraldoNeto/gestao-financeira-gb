import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { competenciaBR, mesAtual } from '@/lib/format'
import { FormDespesa } from './despesa-form'
import { atualizarDespesa } from '../../actions'
import type { DespesaMes } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarDespesaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string; back?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: contratos }] = await Promise.all([
    supabase.from('despesas_mes').select('*').eq('id_despesa', idNum).single(),
    supabase.from('vw_contratos').select('id_contrato, nome_imovel, unidade').eq('status', 'ativo').order('nome_imovel'),
  ])

  const despesa = data as DespesaMes | null
  if (!despesa) notFound()

  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : (despesa.competencia.slice(0, 7) || mesAtual())
  const back = sp.back && sp.back.startsWith('/') ? sp.back : ''
  const voltarPara = back || `/cobrancas?mes=${mes}`

  const alugueis = ((contratos as { id_contrato: number; nome_imovel: string; unidade: string | null }[] | null) ?? []).map(
    (c) => ({ id: c.id_contrato, label: c.unidade ? `${c.nome_imovel} · ${c.unidade}` : c.nome_imovel }),
  )

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Editar despesa"
        descricao={`Despesa de ${competenciaBR(despesa.competencia)}`}
        voltar={voltarPara}
      />
      <FormDespesa
        descricao={despesa.descricao}
        valor={Number(despesa.valor).toFixed(2).replace('.', ',')}
        data={despesa.data ?? ''}
        idContrato={despesa.id_contrato}
        alugueis={alugueis}
        voltar={back || undefined}
        voltarPara={voltarPara}
        action={atualizarDespesa.bind(null, despesa.id_despesa, mes)}
      />
    </div>
  )
}
