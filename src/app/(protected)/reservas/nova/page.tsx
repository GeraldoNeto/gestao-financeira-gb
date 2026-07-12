import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { ReservaForm } from './reserva-form'

export const dynamic = 'force-dynamic'

export default async function NovaReservaPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('empresas')
    .select('id_empresa, nome_empresa')
    .eq('status', 'ativo')
    .order('nome_empresa')

  const empresas = ((data as { id_empresa: number; nome_empresa: string }[] | null) ?? []).map((e) => ({
    id: e.id_empresa,
    nome: e.nome_empresa,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Nova reserva" descricao="Cria a reserva e o crédito inicial" voltar="/reservas" />
      <ReservaForm empresas={empresas} />
    </div>
  )
}
