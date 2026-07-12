import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnPrimary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { brl, dataBR, competenciaBR } from '@/lib/format'
import { FormContrato } from '../form'
import { atualizarContrato, criarDespesaAluguel, excluirDespesaAluguel } from '../actions'
import type { Contrato, DespesaMes } from '@/lib/database.types'

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
  const [{ data }, { data: imoveis }, { data: despesasData }] = await Promise.all([
    supabase.from('contratos').select('*').eq('id_contrato', idNum).single(),
    supabase.from('imoveis').select('id_imovel, nome').order('nome'),
    supabase
      .from('despesas_mes')
      .select('*')
      .eq('id_contrato', idNum)
      .order('data', { ascending: false, nullsFirst: false })
      .order('competencia', { ascending: false }),
  ])

  const contrato = data as Contrato | null
  if (!contrato) notFound()

  const listaImoveis = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
  }))
  const despesas = (despesasData as DespesaMes[] | null) ?? []
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)
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

      {/* Despesas adicionais deste aluguel (IPTU, manutenção, seguro, IR…) */}
      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Despesas deste aluguel
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          IPTU, manutenção, seguro, IR, taxas, contas de consumo e gastos eventuais. Cada despesa é
          descontada da divisão no mês da data.
        </p>

        {sp.erro && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {sp.erro}
          </p>
        )}

        <form
          action={criarDespesaAluguel.bind(null, contrato.id_contrato)}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </span>
            <input
              name="descricao"
              required
              className={inputClass}
              placeholder="Ex.: IPTU, seguro, conserto do telhado"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data</span>
            <input type="date" name="data" required className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor (R$)
            </span>
            <input name="valor" required className={`${inputClass} w-36`} placeholder="0,00" />
          </label>
          <button type="submit" className={btnPrimary}>
            + Lançar despesa
          </button>
        </form>

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
            {despesas.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhuma despesa lançada para este aluguel." />
            )}
            {despesas.map((d) => (
              <tr key={d.id_despesa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{d.descricao}</Td>
                <Td className="text-gray-500">
                  {d.data ? dataBR(d.data) : competenciaBR(d.competencia)}
                </Td>
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
            {despesas.length > 0 && (
              <tr className="border-t border-gray-200 dark:border-gray-700">
                <Td className="font-medium text-gray-500">Total</Td>
                <Td />
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(totalDespesas)}
                </Td>
                <Td />
              </tr>
            )}
          </tbody>
        </Tabela>
      </div>
    </div>
  )
}
