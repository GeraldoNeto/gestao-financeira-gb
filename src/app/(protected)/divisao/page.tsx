import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { calcularRateio } from '../relatorios/data'
import { recorrentesNaCompetencia, type Recorrente } from '@/lib/despesas'
import { criarPagamento, excluirPagamento } from './actions'
import type { DivisaoAluguel, DivisaoPrevista, PagamentoIrmao, ContaIrmaos } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const round2 = (n: number) => Math.round(n * 100) / 100

export default async function DivisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string }>
}) {
  const sp = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : mesAtual()
  const competencia = `${mes}-01`

  const supabase = await createClient()
  const [
    { data: prevista },
    { data: recebida },
    { data: despesas },
    { data: pagamentos },
    { data: pessoas },
    { data: contas },
    { data: recorrData },
  ] = await Promise.all([
    supabase.from('vw_divisao_prevista').select('*').order('nome_imovel').order('nome_irmao'),
    supabase
      .from('vw_divisao_alugueis')
      .select('id_pessoa, nome_irmao, valor_irmao, id_contrato')
      .eq('competencia', competencia),
    supabase.from('despesas_mes').select('valor, id_contrato').eq('competencia', competencia),
    supabase
      .from('pagamentos_irmao')
      .select('*')
      .eq('competencia', competencia)
      .order('id_pagamento'),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
    supabase
      .from('contas_irmaos')
      .select('id_origem, id_destino, valor_brl')
      .eq('competencia', competencia),
    supabase.from('despesas_recorrentes').select('*'),
  ])

  const linhasPrev = (prevista as DivisaoPrevista[] | null) ?? []
  const linhasReceb =
    (recebida as Pick<DivisaoAluguel, 'id_pessoa' | 'nome_irmao' | 'valor_irmao' | 'id_contrato'>[] | null) ??
    []
  const recorrentesMes = recorrentesNaCompetencia(
    (recorrData as Recorrente[] | null) ?? [],
    competencia,
  ).map((r) => ({ valor: r.valor, id_contrato: r.id_contrato }))
  const despRows = [
    ...((despesas as { valor: number; id_contrato: number | null }[] | null) ?? []),
    ...recorrentesMes,
  ]
  const repasses = (pagamentos as PagamentoIrmao[] | null) ?? []
  const listaIrmaos = (pessoas as { id_pessoa: number; nome: string }[] | null) ?? []
  const gastos = despRows.reduce((s, d) => s + Number(d.valor), 0)

  // Previsto por irmão (dos valores cadastrados) — independe de recebimento/gastos
  const previstoPorIrmao = new Map<number, number>()
  for (const l of linhasPrev) {
    previstoPorIrmao.set(l.id_pessoa, (previstoPorIrmao.get(l.id_pessoa) ?? 0) + Number(l.valor_irmao))
  }

  // Repasses (boletos quitados) por irmão no mês
  const pagoPorIrmao = new Map<number, number>()
  for (const p of repasses) {
    pagoPorIrmao.set(p.id_pessoa, (pagoPorIrmao.get(p.id_pessoa) ?? 0) + Number(p.valor))
  }

  // Saldo entre irmãos no mês: credor (origem) +, devedor (destino) −
  const contasRows = (contas as Pick<ContaIrmaos, 'id_origem' | 'id_destino' | 'valor_brl'>[] | null) ?? []
  const saldoIrmaosPorId = new Map<number, number>()
  for (const c of contasRows) {
    saldoIrmaosPorId.set(c.id_origem, (saldoIrmaosPorId.get(c.id_origem) ?? 0) + Number(c.valor_brl))
    saldoIrmaosPorId.set(c.id_destino, (saldoIrmaosPorId.get(c.id_destino) ?? 0) - Number(c.valor_brl))
  }

  // Rateio do recebido, com os gastos (gerais ou por aluguel) já descontados
  const rateio = calcularRateio(linhasReceb, despRows)
  const totalPrevisto = linhasPrev.reduce((s, l) => s + Number(l.valor_irmao), 0)
  const totalRecebido = rateio.totalRecebido
  const totalLiquido = rateio.liquido
  const totalRepassado = repasses.reduce((s, p) => s + Number(p.valor), 0)
  const totalATransferir = round2(totalLiquido - totalRepassado)

  const nomePorId = new Map<number, string>()
  for (const p of listaIrmaos) nomePorId.set(p.id_pessoa, p.nome)
  for (const l of linhasPrev) nomePorId.set(l.id_pessoa, l.nome_irmao)
  for (const i of rateio.irmaos) nomePorId.set(i.id_pessoa, i.nome)

  const idsIrmaos = new Set<number>([
    ...previstoPorIrmao.keys(),
    ...rateio.irmaos.map((i) => i.id_pessoa),
    ...pagoPorIrmao.keys(),
    ...saldoIrmaosPorId.keys(),
  ])
  const rateioPorId = new Map(rateio.irmaos.map((i) => [i.id_pessoa, i]))

  const irmaos = [...idsIrmaos]
    .map((id) => {
      const liquido = rateioPorId.get(id)?.liquido ?? 0
      const pago = pagoPorIrmao.get(id) ?? 0
      const saldoIrmaos = round2(saldoIrmaosPorId.get(id) ?? 0)
      return {
        id,
        nome: nomePorId.get(id) ?? '',
        recebido: rateioPorId.get(id)?.recebido ?? 0,
        liquido,
        pago,
        saldoIrmaos,
        aTransferir: round2(liquido - pago + saldoIrmaos),
        detalhes: linhasPrev.filter((l) => l.id_pessoa === id),
      }
    })
    .sort((a, b) => b.liquido - a.liquido)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Divisão dos aluguéis"
        descricao="Quanto cada irmão recebe — já descontados os gastos e os repasses (boletos)"
      />

      <form method="get" className="mb-6 flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mês (para o recebido)
          </span>
          <input type="month" name="mes" defaultValue={mes} className={inputClass} />
        </label>
        <button type="submit" className={btnSecondary}>
          Ver
        </button>
      </form>

      {sp.erro && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {sp.erro}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card titulo="Previsto por mês" valor={brl(totalPrevisto)} />
        <Card titulo={`Recebido em ${competenciaBR(competencia)}`} valor={brl(totalRecebido)} cor="emerald" />
        <Card titulo="Gastos do mês" valor={`−${brl(gastos)}`} cor="red" />
        <Card titulo="Líquido a dividir" valor={brl(totalLiquido)} cor="emerald" />
        <Card titulo="Já repassado (boletos)" valor={`−${brl(totalRepassado)}`} cor="red" />
        <Card titulo="A transferir aos irmãos" valor={brl(totalATransferir)} cor="emerald" />
      </div>

      {/* Por irmão (sanfona: clique para ver o detalhe por imóvel) */}
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-400">Por irmão</h2>
      <p className="mb-3 text-sm text-gray-500">
        Clique no irmão para ver o detalhe por imóvel (previsto por mês)
      </p>

      {irmaos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Cadastre o valor dos aluguéis e os pesos dos irmãos.
        </div>
      )}

      <div className="space-y-2">
        {irmaos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 px-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid-cols-[1fr_repeat(4,7rem)_1.5rem]">
            <span>Irmão</span>
            <span className="hidden text-right sm:block">Líquido</span>
            <span className="hidden text-right sm:block">Já repassado</span>
            <span className="hidden text-right sm:block">Saldo entre irmãos</span>
            <span className="text-right">A transferir</span>
            <span className="hidden sm:block" />
          </div>
        )}

        {irmaos.map((i) => (
          <details
            key={i.id}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-2 rounded-xl px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:grid-cols-[1fr_repeat(4,7rem)_1.5rem] [&::-webkit-details-marker]:hidden">
              <span className="font-medium text-gray-900 dark:text-gray-100">{i.nome}</span>
              <span className="hidden text-right text-sm text-gray-500 sm:block">{brl(i.liquido)}</span>
              <span className="hidden text-right text-sm text-red-500 sm:block">
                {i.pago > 0 ? `−${brl(i.pago)}` : brl(0)}
              </span>
              <span
                className={`hidden text-right text-sm sm:block ${
                  i.saldoIrmaos > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : i.saldoIrmaos < 0
                      ? 'text-red-500'
                      : 'text-gray-400'
                }`}
              >
                {i.saldoIrmaos > 0 ? `+${brl(i.saldoIrmaos)}` : i.saldoIrmaos < 0 ? brl(i.saldoIrmaos) : brl(0)}
              </span>
              <span className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(i.aTransferir)}
              </span>
              <span
                aria-hidden
                className="hidden justify-self-end text-gray-400 transition-transform group-open:rotate-180 sm:block"
              >
                ▾
              </span>
            </summary>

            <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Detalhe por imóvel (previsto por mês)
              </p>
              {i.detalhes.length === 0 ? (
                <p className="text-sm text-gray-400">Este irmão ainda não recebe de nenhum aluguel.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {i.detalhes.map((l) => (
                    <li
                      key={`${l.id_contrato}-${l.id_pessoa}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="min-w-0 font-medium text-gray-900 dark:text-gray-100">
                        {l.nome_imovel}
                        {l.unidade ? <span className="text-gray-500"> · {l.unidade}</span> : ''}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-gray-500">
                          {brl(l.valor_mensal)} × {Number(l.percentual)}%
                        </span>
                        <span className="w-24 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {brl(l.valor_irmao)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>

      {/* Repasses / boletos quitados */}
      <div className="mt-10">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Repasses aos irmãos (boletos quitados)
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Quando um irmão usa a parte dele para quitar um boleto (em vez de receber a transferência),
          registre aqui. O valor é abatido do que ele tem a transferir — sem afetar os outros.
        </p>

        <form
          action={criarPagamento.bind(null, mes)}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Irmão</span>
            <select name="id_pessoa" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Selecione…
              </option>
              {listaIrmaos.map((p) => (
                <option key={p.id_pessoa} value={p.id_pessoa}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição
            </span>
            <input
              name="descricao"
              required
              className={inputClass}
              placeholder="Ex.: boleto do cartão, conta de luz"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Valor (R$)
            </span>
            <input name="valor" required className={`${inputClass} w-36`} placeholder="0,00" />
          </label>
          <button type="submit" className={btnPrimary}>
            + Registrar repasse
          </button>
        </form>

        <Tabela>
          <thead>
            <tr>
              <Th>Irmão</Th>
              <Th>Descrição</Th>
              <Th className="text-right">Valor</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {repasses.length === 0 && (
              <VazioTabela colunas={4} mensagem="Nenhum repasse registrado neste mês." />
            )}
            {repasses.map((p) => (
              <tr key={p.id_pagamento} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">
                  {nomePorId.get(p.id_pessoa) ?? `#${p.id_pessoa}`}
                </Td>
                <Td>{p.descricao}</Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  −{brl(p.valor)}
                </Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`/divisao/pagamentos/${p.id_pagamento}?mes=${mes}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      Editar
                    </Link>
                    <ExcluirButton
                      action={excluirPagamento.bind(null, p.id_pagamento)}
                      confirmText={`Excluir o repasse "${p.descricao}" (${brl(p.valor)})?`}
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

const cores = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  gray: 'text-gray-900 dark:text-gray-100',
} as const

function Card({
  titulo,
  valor,
  cor = 'gray',
}: {
  titulo: string
  valor: string
  cor?: keyof typeof cores
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`mt-1 text-xl font-semibold ${cores[cor]}`}>{valor}</p>
    </div>
  )
}
