import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, VazioTabela, btnPrimary } from '@/components/ui'
import { brl } from '@/lib/format'
import { ExcluirButton } from '@/components/excluir-button'
import { FormImovel } from '../form'
import { PercentuaisImovelForm } from '../percentuais-form'
import { atualizarImovel } from '../actions'
import { excluirContrato } from '../../contratos/actions'
import type { Imovel, ImovelPessoaPercentual, ContratoView } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: irmaos }, { data: percentuais }, { data: contratos }] = await Promise.all([
    supabase.from('imoveis').select('*').eq('id_imovel', idNum).single(),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
    supabase.from('imovel_pessoa_percentual').select('id_pessoa, percentual').eq('id_imovel', idNum),
    supabase.from('vw_contratos').select('*').eq('id_imovel', idNum).order('unidade'),
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

  const alugueis = (contratos as ContratoView[] | null) ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <PageHeader titulo="Editar imóvel" descricao={imovel.nome} />
        <FormImovel imovel={imovel} action={atualizarImovel.bind(null, imovel.id_imovel)} />
      </div>

      {/* Aluguéis (contratos) deste imóvel */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Aluguéis deste imóvel
            </h2>
            <p className="text-sm text-gray-500">Valor mensal e vencimento de cada unidade</p>
          </div>
          <Link href={`/contratos/nova?imovel=${imovel.id_imovel}`} className={btnPrimary}>
            + Adicionar aluguel
          </Link>
        </div>
        <Tabela>
          <thead>
            <tr>
              <Th>Unidade</Th>
              <Th className="text-right">Valor mensal</Th>
              <Th className="text-right">Vencimento</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {alugueis.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhum aluguel cadastrado para este imóvel." />
            )}
            {alugueis.map((c) => (
              <tr key={c.id_contrato} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{c.unidade ?? '—'}</Td>
                <Td className="text-right font-semibold">{brl(c.valor_mensal)}</Td>
                <Td className="text-right">dia {c.dia_vencimento}</Td>
                <Td className="text-right">
                  <Link
                    href={`/contratos/${c.id_contrato}`}
                    className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    Editar
                  </Link>
                  <ExcluirButton
                    action={excluirContrato.bind(null, c.id_contrato)}
                    confirmText={`Excluir o aluguel ${c.unidade ? '“' + c.unidade + '” ' : ''}(${brl(c.valor_mensal)})?`}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </div>

      {/* Divisão entre os irmãos */}
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
