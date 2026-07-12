import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { AcoesCobranca } from './acoes'
import { gerarCobrancas, excluirCobranca, criarDespesa, excluirDespesa } from './actions'
import { recorrentesNaCompetencia, type Recorrente } from '@/lib/despesas'
import type { CobrancaView, DespesaMes } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function CobrancasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; geradas?: string; erro?: string }>
}) {
  const sp = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : mesAtual()
  const competencia = `${mes}-01`

  const supabase = await createClient()
  const [{ data }, { data: despesasData }, { data: recorrData }] = await Promise.all([
    supabase
      .from('vw_cobrancas')
      .select('*')
      .eq('competencia', competencia)
      .order('vencimento')
      .order('nome_imovel'),
    supabase
      .from('despesas_mes')
      .select('*')
      .eq('competencia', competencia)
      .order('id_despesa'),
    supabase.from('despesas_recorrentes').select('*'),
  ])
  const cobrancas = (data as CobrancaView[] | null) ?? []
  const despesas = (despesasData as DespesaMes[] | null) ?? []
  const recorrentes = recorrentesNaCompetencia((recorrData as Recorrente[] | null) ?? [], competencia)

  const previsto = cobrancas.reduce((s, c) => s + Number(c.valor), 0)
  const recebido = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const pendente = previsto - recebido
  const atrasado = cobrancas
    .filter((c) => c.situacao === 'atrasado')
    .reduce((s, c) => s + Number(c.valor), 0)
  const gastos =
    despesas.reduce((s, d) => s + Number(d.valor), 0) +
    recorrentes.reduce((s, r) => s + Number(r.valor), 0)
  const liquido = recebido - gastos

  // Aluguéis do mês (para vincular um gasto a um aluguel específico)
  const opcoesAluguel = cobrancas.map((c) => ({
    id: c.id_contrato,
    label: c.unidade ? `${c.nome_imovel} · ${c.unidade}` : c.nome_imovel,
  }))
  const rotuloAluguel = new Map(opcoesAluguel.map((o) => [o.id, o.label]))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Aluguéis"
        descricao={`Cobranças da competência ${competenciaBR(competencia)}`}
      />

      {/* Filtro de mês + gerar */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <form method="get" className="flex items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Competência (mês)
            </span>
            <input type="month" name="mes" defaultValue={mes} className={inputClass} />
          </label>
          <button type="submit" className={btnSecondary}>
            Ver
          </button>
        </form>
        <form action={gerarCobrancas}>
          <input type="hidden" name="mes" value={mes} />
          <button type="submit" className={btnPrimary}>
            Gerar cobranças do mês
          </button>
        </form>
      </div>

      {sp.geradas !== undefined && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {Number(sp.geradas) > 0
            ? `${sp.geradas} cobrança(s) gerada(s) para ${competenciaBR(competencia)}.`
            : `Nenhuma cobrança nova — os contratos ativos já possuem cobrança em ${competenciaBR(competencia)}.`}
        </p>
      )}
      {sp.erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {sp.erro}
        </p>
      )}

      {/* Resumo do mês */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Resumo titulo="Previsto" valor={brl(previsto)} />
        <Resumo titulo="Recebido" valor={brl(recebido)} cor="emerald" />
        <Resumo titulo="Pendente" valor={brl(pendente)} cor="amber" />
        <Resumo titulo="Em atraso" valor={brl(atrasado)} cor="red" />
        <Resumo titulo="Gastos do mês" valor={brl(gastos)} cor="red" />
        <Resumo titulo="Líquido a dividir" valor={brl(liquido)} cor="emerald" />
      </div>

      <Tabela>
        <thead>
          <tr>
            <Th>Imóvel / unidade</Th>
            <Th>Vencimento</Th>
            <Th className="text-right">Valor</Th>
            <Th>Situação</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.length === 0 && (
            <VazioTabela
              colunas={5}
              mensagem="Nenhuma cobrança nesta competência. Use “Gerar cobranças do mês”."
            />
          )}
          {cobrancas.map((c) => (
            <tr key={c.id_cobranca} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">
                {c.nome_imovel}
                {c.unidade ? <span className="text-gray-500"> · {c.unidade}</span> : ''}
              </Td>
              <Td>{dataBR(c.vencimento)}</Td>
              <Td className="text-right font-semibold">{brl(c.valor)}</Td>
              <Td>
                <SituacaoBadge situacao={c.situacao} />
              </Td>
              <Td className="text-right">
                <span className="inline-flex items-center gap-1">
                  <AcoesCobranca id={c.id_cobranca} pago={c.status === 'pago'} />
                  <Link
                    href={`/cobrancas/${c.id_cobranca}?mes=${mes}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    Editar
                  </Link>
                  <ExcluirButton
                    action={excluirCobranca.bind(null, c.id_cobranca)}
                    confirmText={`Excluir a cobrança de ${c.nome_imovel} (${brl(c.valor)})?`}
                  />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      {/* Gastos do mês */}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Gastos do mês
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Despesas de {competenciaBR(competencia)} — descontadas do total recebido antes da divisão
          entre os irmãos
        </p>

        <form
          action={criarDespesa.bind(null, mes)}
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
              placeholder="Ex.: conserto do telhado, IPTU"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descontar de
            </span>
            <select name="id_contrato" defaultValue="" className={inputClass}>
              <option value="">Todos os aluguéis (geral)</option>
              {opcoesAluguel.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor (R$)
            </span>
            <input name="valor" required className={`${inputClass} w-36`} placeholder="0,00" />
          </label>
          <button type="submit" className={btnPrimary}>
            + Lançar gasto
          </button>
        </form>

        <Tabela>
          <thead>
            <tr>
              <Th>Descrição</Th>
              <Th>Descontar de</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {despesas.length === 0 && recorrentes.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhum gasto lançado neste mês." />
            )}
            {recorrentes.map((r) => (
              <tr key={`rec-${r.id_recorrente}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">
                  {r.descricao}
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    todo mês
                  </span>
                </Td>
                <Td>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {r.id_contrato != null ? rotuloAluguel.get(r.id_contrato) ?? 'Aluguel' : 'Aluguel'}
                  </span>
                </Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(r.valor)}
                </Td>
                <Td className="text-right">
                  <Link
                    href={r.id_contrato != null ? `/contratos/${r.id_contrato}` : '/contratos'}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    No aluguel
                  </Link>
                </Td>
              </tr>
            ))}
            {despesas.map((d) => (
              <tr key={d.id_despesa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{d.descricao}</Td>
                <Td>
                  {d.id_contrato == null ? (
                    <span className="text-gray-500">Todos (geral)</span>
                  ) : (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {rotuloAluguel.get(d.id_contrato) ?? 'Aluguel'}
                    </span>
                  )}
                </Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(d.valor)}
                </Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`/cobrancas/despesas/${d.id_despesa}?mes=${mes}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      Editar
                    </Link>
                    <ExcluirButton
                      action={excluirDespesa.bind(null, d.id_despesa)}
                      confirmText={`Excluir o gasto "${d.descricao}" (${brl(d.valor)})?`}
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

function Resumo({
  titulo,
  valor,
  cor = 'gray',
}: {
  titulo: string
  valor: string
  cor?: 'gray' | 'emerald' | 'amber' | 'red'
}) {
  const cores = {
    gray: 'text-gray-900 dark:text-gray-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cores[cor]}`}>{valor}</p>
    </div>
  )
}

function SituacaoBadge({ situacao }: { situacao: CobrancaView['situacao'] }) {
  const map = {
    pago: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    pendente: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    atrasado: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }
  const label = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[situacao]}`}>
      {label[situacao]}
    </span>
  )
}
