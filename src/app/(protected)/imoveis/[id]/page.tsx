import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormImovel } from '../form'
import { PercentuaisImovelForm } from '../percentuais-form'
import { atualizarImovel } from '../actions'
import type { Imovel, ImovelPessoaPercentual } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: irmaos }, { data: percentuais }] = await Promise.all([
    supabase.from('imoveis').select('*').eq('id_imovel', idNum).single(),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
    supabase
      .from('imovel_pessoa_percentual')
      .select('id_pessoa, percentual')
      .eq('id_imovel', idNum),
  ])

  const imovel = data as Imovel | null
  if (!imovel) notFound()

  const mapaPct = new Map(
    ((percentuais as Pick<ImovelPessoaPercentual, 'id_pessoa' | 'percentual'>[] | null) ?? []).map(
      (r) => [r.id_pessoa, r.percentual],
    ),
  )
  const irmaosPct = ((irmaos as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id_pessoa,
    nome: p.nome,
    percentual: mapaPct.get(p.id_pessoa) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <PageHeader titulo="Editar imóvel" descricao={imovel.nome} />
        <FormImovel imovel={imovel} action={atualizarImovel.bind(null, imovel.id_imovel)} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Divisão do aluguel entre os irmãos
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Percentual que cada irmão recebe do aluguel deste imóvel
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <PercentuaisImovelForm idImovel={imovel.id_imovel} irmaos={irmaosPct} />
        </div>
      </div>
    </div>
  )
}
