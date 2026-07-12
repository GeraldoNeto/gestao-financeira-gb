import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { brl, dataBR, competenciaBR } from '@/lib/format'
import { FormContrato } from '../form'
import { DespesaAluguelForm } from './despesa-aluguel-form'
import { atualizarContrato, excluirDespesaAluguel, excluirDespesaRecorrente } from '../actions'
import type { Contrato, DespesaMes, DespesaRecorrente } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarContratoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ erro?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: imoveis }, { data: avulsasData }, { data: recorrData }] = await Promise.all([
    supabase.from('contratos').select('*').eq('id_contrato', idNum).single(),
    supabase.from('imoveis').select('id_imovel, nome').order('nome'),
    supabase
      .from('despesas_mes')
      .select('*')
      .eq('id_contrato', idNum)
      .order('data', { ascending: false, nullsFirst: false })
      .order('competencia', { ascending: false }),
    supabase.from('despesas_recorrentes').select('*').eq('id_contrato', idNum).order('id_recorrente', { ascending: false }),
  ])

  const contrato = data as Contrato | null
  if (!contrato) notFound()

  const listaImoveis = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
  }))
  const avulsas = (avulsasData as DespesaMes[] | null) ?? []
  const recorrentes = (recorrData as DespesaRecorrente[] | null) ?? []
  const back = `/contratos/${idNum}`

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <PageHeader
          titulo="Editar aluguel"
          descricao={`Valor mensal: ${brl(contrato.valor_mensal)}`}
          voltar="/contratos"
        />
        <FormContrato
          contrato={contrato}
          imoveis={listaImoveis}
          action={atualizarContrato.bind(null, contrato.id_contrato)}
          voltarPara={`/imoveis/${contrato.id_imovel}`}
        />
      </div>

      {/* Despesas deste aluguel */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Despesas deste aluguel
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          IPTU, manutenção, seguro, IR, taxas, contas de consumo e gastos eventuais. Cada despesa é
          descontada da divisão. Marque <strong>“Repetir todo mês”</strong> para despesas recorrentes.
        </p>

        {sp.erro && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {sp.erro}
          </p>
        )}

        <DespesaAluguelForm idContrato={contrato.id_contrato} />

        {/* Recorrentes */}
        <h3 className="mb-2 mt-6 text-sm font-medium uppercase tracking-wide text-gray-400">
          Recorrentes (todo mês)
        </h3>
        <Tabela>
          <thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Período</Th>
              <Th className="text-right">Valor/mês</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {recorrentes.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhuma despesa recorrente." />
            )}
            {recorrentes.map((r) => (
              <tr key={r.id_recorrente} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{r.descricao}</Td>
                <Td className="text-gray-500">
                  desde {competenciaBR(r.data_inicio)}
                  {r.data_fim ? ` até ${competenciaBR(r.data_fim)}` : ''}
                </Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(r.valor)}
                </Td>
                <Td className="text-right">
                  <ExcluirButton
                    action={excluirDespesaRecorrente.bind(null, r.id_recorrente)}
                    confirmText={`Excluir a despesa recorrente "${r.descricao}" (${brl(r.valor)}/mês)?`}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>

        {/* Avulsas */}
        <h3 className="mb-2 mt-6 text-sm font-medium uppercase tracking-wide text-gray-400">
          Avulsas (um mês)
        </h3>
        <Tabela>
          <thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Data</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {avulsas.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhuma despesa avulsa." />
            )}
            {avulsas.map((d) => (
              <tr key={d.id_despesa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{d.descricao}</Td>
                <Td className="text-gray-500">{d.data ? dataBR(d.data) : competenciaBR(d.competencia)}</Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(d.valor)}
                </Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`/cobrancas/despesas/${d.id_despesa}?back=${encodeURIComponent(back)}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      Editar
                    </Link>
                    <ExcluirButton
                      action={excluirDespesaAluguel.bind(null, d.id_despesa)}
                      confirmText={`Excluir a despesa "${d.descricao}" (${brl(d.valor)})?`}
                    />
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </div>
    </div>
  )
}
