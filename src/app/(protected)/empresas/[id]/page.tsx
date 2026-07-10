import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormEmpresa } from '../form'
import { PercentuaisForm } from '../percentuais-form'
import { atualizarEmpresa } from '../actions'
import type { Empresa, EmpresaPessoaPercentual } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: pessoas }, { data: percentuais }] = await Promise.all([
    supabase.from('empresas').select('*').eq('id_empresa', idNum).single(),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
    supabase
      .from('empresa_pessoa_percentual')
      .select('id_pessoa, percentual')
      .eq('id_empresa', idNum),
  ])

  const empresa = data as Empresa | null
  if (!empresa) notFound()

  const mapaPct = new Map(
    ((percentuais as Pick<EmpresaPessoaPercentual, 'id_pessoa' | 'percentual'>[] | null) ?? []).map(
      (r) => [r.id_pessoa, r.percentual],
    ),
  )
  const pessoasPct = ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id_pessoa,
    nome: p.nome,
    percentual: mapaPct.get(p.id_pessoa) ?? 100,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <PageHeader titulo="Editar empresa" descricao={empresa.nome_empresa} />
        <FormEmpresa empresa={empresa} action={atualizarEmpresa.bind(null, empresa.id_empresa)} />
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Percentuais de recebimento
        </h2>
        <p className="mb-4 text-sm text-gray-500">Percentual que cada pessoa recebe nos rateios desta empresa</p>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <PercentuaisForm idEmpresa={empresa.id_empresa} pessoas={pessoasPct} />
        </div>
      </div>
    </div>
  )
}
