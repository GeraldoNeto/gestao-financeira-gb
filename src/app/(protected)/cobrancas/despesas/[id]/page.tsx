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
  searchParams: Promise<{ mes?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('despesas_mes')
    .select('*')
    .eq('id_despesa', idNum)
    .single()

  const despesa = data as DespesaMes | null
  if (!despesa) notFound()

  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : (despesa.competencia.slice(0, 7) || mesAtual())
  const voltarPara = `/cobrancas?mes=${mes}`

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Editar gasto"
        descricao={`Gasto de ${competenciaBR(despesa.competencia)}`}
        voltar={voltarPara}
      />
      <FormDespesa
        descricao={despesa.descricao}
        valor={Number(despesa.valor).toFixed(2).replace('.', ',')}
        voltarPara={voltarPara}
        action={atualizarDespesa.bind(null, despesa.id_despesa, mes)}
      />
    </div>
  )
}
