import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormPessoa } from '../form'
import { AlugueisIrmaoForm } from '../alugueis-form'
import { atualizarPessoa } from '../actions'
import type { PessoaFisica, ContratoPessoaPercentual, ContratoView } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarIrmaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: contratos }, { data: percentuais }] = await Promise.all([
    supabase.from('pessoas_fisicas').select('*').eq('id_pessoa', idNum).single(),
    supabase
      .from('vw_contratos')
      .select('id_contrato, unidade, nome_imovel, valor_mensal')
      .eq('status', 'ativo')
      .order('unidade'),
    supabase
      .from('contrato_pessoa_percentual')
      .select('id_contrato, percentual')
      .eq('id_pessoa', idNum),
  ])

  const pessoa = data as PessoaFisica | null
  if (!pessoa) notFound()

  const mapaPct = new Map(
    (
      (percentuais as Pick<ContratoPessoaPercentual, 'id_contrato' | 'percentual'>[] | null) ?? []
    ).map((r) => [r.id_contrato, r.percentual]),
  )
  const alugueis = (
    (contratos as Pick<
      ContratoView,
      'id_contrato' | 'unidade' | 'nome_imovel' | 'valor_mensal'
    >[] | null) ?? []
  ).map((c) => ({
    id: c.id_contrato,
    nome: c.unidade ?? c.nome_imovel,
    valor: c.valor_mensal,
    percentual: mapaPct.get(c.id_contrato) ?? 0,
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
          Peso (%) deste irmão em cada aluguel — usado na divisão dos valores
        </p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <AlugueisIrmaoForm idPessoa={pessoa.id_pessoa} alugueis={alugueis} />
        </div>
      </div>
    </div>
  )
}
