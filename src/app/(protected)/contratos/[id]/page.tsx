import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { brl } from '@/lib/format'
import { FormContrato } from '../form'
import { atualizarContrato } from '../actions'
import type { Contrato } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: imoveis }] = await Promise.all([
    supabase.from('contratos').select('*').eq('id_contrato', idNum).single(),
    supabase.from('imoveis').select('id_imovel, nome').order('nome'),
  ])

  const contrato = data as Contrato | null
  if (!contrato) notFound()

  const listaImoveis = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Editar aluguel" descricao={`Valor mensal: ${brl(contrato.valor_mensal)}`} />
      <FormContrato
        contrato={contrato}
        imoveis={listaImoveis}
        action={atualizarContrato.bind(null, contrato.id_contrato)}
        voltarPara={`/imoveis/${contrato.id_imovel}`}
      />
    </div>
  )
}
