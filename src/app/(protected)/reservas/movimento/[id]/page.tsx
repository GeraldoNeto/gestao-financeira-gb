import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { MovForm } from './mov-form'
import { atualizarMovimento } from '../../actions'
import type { ReservaMovimento } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarMovimentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('reserva_movimentos')
    .select('*')
    .eq('id_movimento', idNum)
    .single()

  const mov = data as ReservaMovimento | null
  if (!mov) notFound()

  const voltarPara = `/reservas/${mov.id_reserva}`

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Editar movimentação" descricao="A edição recalcula os saldos da reserva" voltar={voltarPara} />
      <MovForm
        tipo={mov.tipo}
        descricao={mov.descricao}
        valor={Number(mov.valor).toFixed(2).replace('.', ',')}
        voltarPara={voltarPara}
        action={atualizarMovimento.bind(null, mov.id_movimento, mov.id_reserva)}
      />
    </div>
  )
}
