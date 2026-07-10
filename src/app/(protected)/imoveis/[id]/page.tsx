import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormImovel } from '../form'
import { atualizarImovel } from '../actions'
import type { Imovel } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.from('imoveis').select('*').eq('id_imovel', idNum).single()
  const imovel = data as Imovel | null
  if (!imovel) notFound()

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Editar imóvel" descricao={imovel.nome} />
      <FormImovel imovel={imovel} action={atualizarImovel.bind(null, imovel.id_imovel)} />
    </div>
  )
}
