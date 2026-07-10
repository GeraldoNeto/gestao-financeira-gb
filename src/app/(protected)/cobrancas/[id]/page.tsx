import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { competenciaBR, mesAtual } from '@/lib/format'
import { FormEditarCobranca } from './form-editar'
import type { CobrancaView } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarCobrancaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { id } = await params
  const { mes: mesParam } = await searchParams
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : mesAtual()

  const supabase = await createClient()
  const { data } = await supabase.from('vw_cobrancas').select('*').eq('id_cobranca', idNum).single()
  const cobranca = data as CobrancaView | null
  if (!cobranca) notFound()

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Editar cobrança"
        descricao={`Competência ${competenciaBR(cobranca.competencia)}`}
      />
      <FormEditarCobranca cobranca={cobranca} mes={mes} />
    </div>
  )
}
