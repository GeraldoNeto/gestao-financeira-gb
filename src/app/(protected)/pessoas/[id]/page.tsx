import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormPessoa } from '../form'
import { AlugueisIrmaoForm } from '../alugueis-form'
import { atualizarPessoa } from '../actions'
import type { PessoaFisica, ImovelPessoaPercentual } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarIrmaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: imoveis }, { data: percentuais }] = await Promise.all([
    supabase.from('pessoas_fisicas').select('*').eq('id_pessoa', idNum).single(),
    supabase.from('imoveis').select('id_imovel, nome').eq('status', 'ativo').order('nome'),
    supabase.from('imovel_pessoa_percentual').select('id_imovel, percentual').eq('id_pessoa', idNum),
  ])

  const pessoa = data as PessoaFisica | null
  if (!pessoa) notFound()

  const mapaPct = new Map(
    ((percentuais as Pick<ImovelPessoaPercentual, 'id_imovel' | 'percentual'>[] | null) ?? []).map(
      (r) => [r.id_imovel, r.percentual],
    ),
  )
  const imoveisPct = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
    percentual: mapaPct.get(i.id_imovel) ?? 0,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <PageHeader titulo="Editar irmão" descricao={pessoa.nome} />
        <FormPessoa pessoa={pessoa} action={atualizarPessoa.bind(null, pessoa.id_pessoa)} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Aluguéis que este irmão recebe
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Peso (%) deste irmão em cada imóvel — usado na divisão dos aluguéis
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <AlugueisIrmaoForm idPessoa={pessoa.id_pessoa} imoveis={imoveisPct} />
        </div>
      </div>
    </div>
  )
}
