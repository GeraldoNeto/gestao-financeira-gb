import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormContrato } from '../form'
import { atualizarContrato } from '../actions'
import type { Contrato } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: imoveis }, { data: pessoas }] = await Promise.all([
    supabase.from('contratos').select('*').eq('id_contrato', idNum).single(),
    supabase.from('imoveis').select('id_imovel, nome').order('nome'),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').order('nome'),
  ])

  const contrato = data as Contrato | null
  if (!contrato) notFound()

  const listaImoveis = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
  }))
  const listaPessoas = ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id_pessoa,
    nome: p.nome,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Editar contrato" descricao={`${contrato.valor_mensal}`} />
      <FormContrato
        contrato={contrato}
        imoveis={listaImoveis}
        pessoas={listaPessoas}
        action={atualizarContrato.bind(null, contrato.id_contrato)}
      />
    </div>
  )
}
