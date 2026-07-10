import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR, competenciaBR, mesAtual } from '@/lib/format'
import { Tabela, Th, Td, VazioTabela, TituloSessao, TooltipBubble } from '@/components/ui'
import type { Dashboard, UltimoLancamento, CobrancaView } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const competenciaMes = `${mesAtual()}-01`
  const [{ data: dash, error }, { data: ultimos }, { data: cobrancasMes }] = await Promise.all([
    supabase.from('vw_dashboard').select('*').single(),
    supabase.from('vw_ultimos_lancamentos').select('*'),
    supabase.from('vw_cobrancas').select('valor, status, situacao').eq('competencia', competenciaMes),
  ])

  const d = (dash as Dashboard | null) ?? null
  const lancamentos = (ultimos as UltimoLancamento[] | null) ?? []

  const cobrancas = (cobrancasMes as Pick<CobrancaView, 'valor' | 'status' | 'situacao'>[] | null) ?? []
  const aluguel = {
    previsto: cobrancas.reduce((s, c) => s + Number(c.valor), 0),
    recebido: cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0),
    atrasado: cobrancas.filter((c) => c.situacao === 'atrasado').reduce((s, c) => s + Number(c.valor), 0),
  }
  const alugPendente = aluguel.previsto - aluguel.recebido

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Indicadores financeiros em tempo real</p>

      <LegendaCardSessao />

      {error && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Não foi possível carregar os dados ({error.message}). Verifique se as migrations foram
          aplicadas no seu projeto Supabase e se o <code>.env.local</code> está configurado.
        </p>
      )}

      {/* Aluguéis do mês atual */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <TituloSessao
            titulo={`Aluguéis · ${competenciaBR(competenciaMes)}`}
            dica="Cobranças de aluguel da competência (mês) atual"
          />
          <Link href="/cobrancas" className="text-sm text-emerald-600 hover:underline">
            Ver aluguéis →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card titulo="Previsto no mês" valor={brl(aluguel.previsto)} descricao="Total das cobranças de aluguel da competência atual" />
          <Card titulo="Recebido" valor={brl(aluguel.recebido)} cor="emerald" descricao="Cobranças de aluguel já pagas neste mês" />
          <Card titulo="Pendente" valor={brl(alugPendente)} cor="amber" descricao="Cobranças de aluguel ainda não pagas neste mês" />
          <Card titulo="Em atraso" valor={brl(aluguel.atrasado)} cor="red" descricao="Cobranças pendentes com vencimento já passado" />
        </div>
      </section>

      {/* Financeiro geral */}
      <section className="mt-8">
        <div className="mb-3">
          <TituloSessao titulo="Financeiro geral" dica="Totais consolidados de todo o sistema" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            titulo="Total recebido"
            valor={brl(d?.total_recebido)}
            cor="emerald"
            descricao="Soma de todos os créditos lançados para empresas"
          />
          <Card
            titulo="Total distribuído"
            valor={brl(d?.total_distribuido)}
            cor="blue"
            descricao="Soma dos créditos gerados para pessoas físicas por meio de rateios"
          />
          <Card
            titulo="Total debitado"
            valor={brl(d?.total_debitado)}
            cor="red"
            descricao="Soma de todos os débitos (empresas e pessoas)"
          />
          <Card
            titulo="Diferença pendente"
            valor={brl(d?.diferenca_pendente)}
            cor="amber"
            descricao="Soma dos resíduos de arredondamento gerados nos rateios"
          />
        </div>
        <BarraDistribuicao
          recebido={d?.total_recebido ?? 0}
          distribuido={d?.total_distribuido ?? 0}
          debitado={d?.total_debitado ?? 0}
        />
      </section>

      {/* Empresas */}
      <section className="mt-8">
        <div className="mb-3">
          <TituloSessao titulo="Empresas" dica="Indicadores consolidados das empresas" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            titulo="Cadastradas"
            valor={String(d?.empresas_total ?? 0)}
            descricao="Quantidade de empresas cadastradas"
          />
          <Card
            titulo="Créditos"
            valor={brl(d?.empresas_creditos)}
            cor="emerald"
            descricao="Total de créditos lançados para empresas"
          />
          <Card
            titulo="Débitos"
            valor={brl(d?.empresas_debitos)}
            cor="red"
            descricao="Total de débitos lançados para empresas"
          />
          <Card
            titulo="Saldo"
            valor={brl(d?.empresas_saldo)}
            cor="blue"
            descricao="Créditos menos débitos das empresas"
          />
        </div>
      </section>

      {/* Pessoas Físicas */}
      <section className="mt-8">
        <div className="mb-3">
          <TituloSessao titulo="Pessoas Físicas" dica="Indicadores consolidados das pessoas físicas" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            titulo="Cadastradas"
            valor={String(d?.pessoas_total ?? 0)}
            descricao="Quantidade de pessoas físicas cadastradas"
          />
          <Card
            titulo="Créditos"
            valor={brl(d?.pessoas_creditos)}
            cor="emerald"
            descricao="Total de créditos das pessoas físicas (inclui os gerados por rateio)"
          />
          <Card
            titulo="Débitos"
            valor={brl(d?.pessoas_debitos)}
            cor="red"
            descricao="Total de débitos das pessoas físicas"
          />
          <Card
            titulo="Saldo"
            valor={brl(d?.pessoas_saldo)}
            cor="blue"
            descricao="Créditos menos débitos das pessoas físicas"
          />
        </div>
      </section>

      {/* Últimos lançamentos */}
      <section className="mt-8">
        <div className="mb-3">
          <TituloSessao
            titulo="Últimos lançamentos"
            dica="Os 20 lançamentos mais recentes (créditos e débitos, de empresas e pessoas)"
          />
        </div>
        <Tabela>
          <thead>
            <tr>
              <Th>Data</Th>
              <Th>Tipo</Th>
              <Th>Origem</Th>
              <Th>Nome</Th>
              <Th>Histórico</Th>
              <Th className="text-right">Valor</Th>
            </tr>
          </thead>
          <tbody>
            {lancamentos.length === 0 && (
              <VazioTabela colunas={6} mensagem="Nenhum lançamento registrado ainda." />
            )}
            {lancamentos.map((l) => (
              <tr
                key={`${l.tipo_entidade}-${l.tipo}-${l.id}`}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
              >
                <Td>{dataBR(l.data_lancamento)}</Td>
                <Td>
                  {l.tipo === 'CREDITO' ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Crédito
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                      Débito
                    </span>
                  )}
                </Td>
                <Td className="capitalize text-gray-500">{l.tipo_entidade}</Td>
                <Td className="font-medium text-gray-900 dark:text-gray-100">{l.entidade_nome}</Td>
                <Td>{l.historico ?? '—'}</Td>
                <Td
                  className={`text-right font-semibold ${l.tipo === 'CREDITO' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {l.tipo === 'CREDITO' ? '+' : '−'} {brl(l.valor)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </section>
    </div>
  )
}

/** Breve glossário: explica o que são Cards e Sessões na interface. */
function LegendaCardSessao() {
  return (
    <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-200">
        <span aria-hidden>ℹ️</span> Como ler esta tela
      </p>
      <ul className="space-y-1.5 text-gray-500 dark:text-gray-400">
        <li>
          <strong className="text-gray-700 dark:text-gray-300">Card:</strong> bloco de informação
          ou funcionalidade exibido na tela, normalmente utilizado para agrupar dados ou ações
          relacionadas.
        </li>
        <li>
          <strong className="text-gray-700 dark:text-gray-300">Sessão:</strong> seção da página que
          organiza e agrupa diferentes cards ou conteúdos de um mesmo contexto.
        </li>
      </ul>
    </section>
  )
}

const cores = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  gray: 'text-gray-900 dark:text-gray-100',
} as const

function Card({
  titulo,
  valor,
  cor = 'gray',
  descricao,
}: {
  titulo: string
  valor: string
  cor?: keyof typeof cores
  descricao?: string
}) {
  return (
    <div className="group/tip relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`mt-2 text-xl font-semibold ${cores[cor]}`}>{valor}</p>
      {descricao && <TooltipBubble texto={descricao} />}
    </div>
  )
}

/** Barra proporcional recebido / distribuído / debitado. */
function BarraDistribuicao({
  recebido,
  distribuido,
  debitado,
}: {
  recebido: number
  distribuido: number
  debitado: number
}) {
  const total = recebido + distribuido + debitado
  if (total <= 0) return null
  const pct = (v: number) => `${(v / total) * 100}%`
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="bg-emerald-500" style={{ width: pct(recebido) }} />
        <div className="bg-blue-500" style={{ width: pct(distribuido) }} />
        <div className="bg-red-500" style={{ width: pct(debitado) }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <Legenda cor="bg-emerald-500" rotulo={`Recebido · ${brl(recebido)}`} />
        <Legenda cor="bg-blue-500" rotulo={`Distribuído · ${brl(distribuido)}`} />
        <Legenda cor="bg-red-500" rotulo={`Debitado · ${brl(debitado)}`} />
      </div>
    </div>
  )
}

function Legenda({ cor, rotulo }: { cor: string; rotulo: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${cor}`} />
      {rotulo}
    </span>
  )
}
