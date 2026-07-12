import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR, competenciaBR } from '@/lib/format'
import { PageHeader, BadgeStatus, VazioTabela, Tabela, Th, Td } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirContrato } from './actions'
import type { ContratoView, DespesaMes, DespesaRecorrente } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ imovel?: string }>
}) {
  const sp = await searchParams
  const idImovel = Number(sp.imovel)

  const supabase = await createClient()
  let q = supabase.from('vw_contratos').select('*').order('nome_imovel').order('unidade')
  if (Number.isInteger(idImovel) && idImovel > 0) q = q.eq('id_imovel', idImovel)
  const { data } = await q
  const contratos = (data as ContratoView[] | null) ?? []

  // Despesas adicionais de cada aluguel (para a sanfona)
  const ids = contratos.map((c) => c.id_contrato)
  const [{ data: despesasData }, { data: recorrData }] = ids.length
    ? await Promise.all([
        supabase
          .from('despesas_mes')
          .select('*')
          .in('id_contrato', ids)
          .order('data', { ascending: false, nullsFirst: false })
          .order('competencia', { ascending: false }),
        supabase
          .from('despesas_recorrentes')
          .select('*')
          .in('id_contrato', ids)
          .order('id_recorrente', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }]
  const despesasPorContrato = new Map<number, DespesaMes[]>()
  for (const d of (despesasData as DespesaMes[] | null) ?? []) {
    const arr = despesasPorContrato.get(d.id_contrato!) ?? []
    arr.push(d)
    despesasPorContrato.set(d.id_contrato!, arr)
  }
  const recorrPorContrato = new Map<number, DespesaRecorrente[]>()
  for (const r of (recorrData as DespesaRecorrente[] | null) ?? []) {
    const arr = recorrPorContrato.get(r.id_contrato) ?? []
    arr.push(r)
    recorrPorContrato.set(r.id_contrato, arr)
  }

  const nomeImovel = contratos[0]?.nome_imovel

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Contratos"
        descricao={
          Number.isInteger(idImovel) && nomeImovel
            ? `Contratos do imóvel: ${nomeImovel}`
            : 'Contratos de aluguel (por imóvel)'
        }
        acao={{ href: '/contratos/nova', label: '+ Novo contrato' }}
      />

      {contratos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Nenhum contrato cadastrado ainda.
        </div>
      )}

      <div className="space-y-3">
        {contratos.map((c) => {
          const despesas = despesasPorContrato.get(c.id_contrato) ?? []
          const recorrentes = recorrPorContrato.get(c.id_contrato) ?? []
          const totalRecorr = recorrentes.reduce((s, r) => s + Number(r.valor), 0)
          return (
            <div
              key={c.id_contrato}
              className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Linha do aluguel */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {c.nome_imovel}
                    {c.unidade ? <span className="text-gray-500"> · {c.unidade}</span> : ''}
                  </p>
                  <p className="text-sm text-gray-500">
                    {brl(c.valor_mensal)} · venc. dia {c.dia_vencimento} · {dataBR(c.data_inicio)}
                    {c.data_fim ? ` – ${dataBR(c.data_fim)}` : ' – vigente'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeStatus status={c.status} />
                  <Link
                    href={`/contratos/${c.id_contrato}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    Editar
                  </Link>
                  <ExcluirButton
                    action={excluirContrato.bind(null, c.id_contrato)}
                    confirmText={`Excluir o contrato do imóvel ${c.nome_imovel}${c.unidade ? ' · ' + c.unidade : ''}?`}
                  />
                </div>
              </div>

              {/* Sanfona: despesas adicionais deste aluguel */}
              <details className="group border-t border-gray-100 dark:border-gray-800">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/40 [&::-webkit-details-marker]:hidden">
                  <span>
                    Despesas adicionais{' '}
                    <span className="text-gray-400">({despesas.length + recorrentes.length})</span>
                    {totalRecorr > 0 && (
                      <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                        −{brl(totalRecorr)}/mês
                      </span>
                    )}
                  </span>
                  <span aria-hidden className="text-gray-400 transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="px-4 pb-3">
                  <Tabela>
                    <thead>
                      <tr>
                        <Th>Descrição</Th>
                        <Th>Quando</Th>
                        <Th className="text-right">Valor</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.length === 0 && recorrentes.length === 0 && (
                        <VazioTabela
                          colunas={3}
                          mensagem="Nenhuma despesa. Cadastre em “Editar”."
                        />
                      )}
                      {recorrentes.map((r) => (
                        <tr key={`rec-${r.id_recorrente}`}>
                          <Td className="font-medium text-gray-900 dark:text-gray-100">
                            {r.descricao}
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              todo mês
                            </span>
                          </Td>
                          <Td className="text-gray-500">
                            desde {competenciaBR(r.data_inicio)}
                            {r.data_fim ? ` até ${competenciaBR(r.data_fim)}` : ''}
                          </Td>
                          <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                            −{brl(r.valor)}
                          </Td>
                        </tr>
                      ))}
                      {despesas.map((d) => (
                        <tr key={d.id_despesa}>
                          <Td className="font-medium text-gray-900 dark:text-gray-100">
                            {d.descricao}
                          </Td>
                          <Td className="text-gray-500">
                            {d.data ? dataBR(d.data) : competenciaBR(d.competencia)}
                          </Td>
                          <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                            −{brl(d.valor)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Tabela>
                </div>
              </details>
            </div>
          )
        })}
      </div>
    </div>
  )
}
