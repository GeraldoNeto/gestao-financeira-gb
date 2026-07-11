import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { Tabela, Th, Td, VazioTabela } from '@/components/ui'
import type { CobrancaView, DivisaoPrevista } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function InicioPage() {
  const supabase = await createClient()
  const competencia = `${mesAtual()}-01`
  const [
    { data: cobrancasMes },
    { data: divisao },
    { count: qtdImoveis },
    { count: qtdContratos },
    { count: qtdIrmaos },
    { data: pesos },
  ] = await Promise.all([
    supabase.from('vw_cobrancas').select('valor, status, situacao').eq('competencia', competencia),
    supabase.from('vw_divisao_prevista').select('*'),
    supabase.from('imoveis').select('id_imovel', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('contratos').select('id_contrato', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('pessoas_fisicas').select('id_pessoa', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('contrato_pessoa_percentual').select('id_pessoa'),
  ])

  const cobrancas = (cobrancasMes as Pick<CobrancaView, 'valor' | 'status' | 'situacao'>[] | null) ?? []
  const previsto = cobrancas.reduce((s, c) => s + Number(c.valor), 0)
  const recebido = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const pendente = previsto - recebido
  const atrasado = cobrancas.filter((c) => c.situacao === 'atrasado').reduce((s, c) => s + Number(c.valor), 0)
  const qtdPagas = cobrancas.filter((c) => c.status === 'pago').length

  const linhasDiv = (divisao as DivisaoPrevista[] | null) ?? []
  const porIrmao = new Map<number, { nome: string; total: number }>()
  for (const l of linhasDiv) {
    const a = porIrmao.get(l.id_pessoa) ?? { nome: l.nome_irmao, total: 0 }
    a.total += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, a)
  }
  const irmaos = [...porIrmao.values()].sort((a, b) => b.total - a.total)

  const nImoveis = qtdImoveis ?? 0
  const nContratos = qtdContratos ?? 0
  const nIrmaos = qtdIrmaos ?? 0
  const nComPeso = new Set(((pesos as { id_pessoa: number }[] | null) ?? []).map((p) => p.id_pessoa))
    .size

  const s = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
  const passos: {
    num: number
    href: string
    titulo: string
    status: string
    feito: boolean
  }[] = [
    {
      num: 1,
      href: '/imoveis',
      titulo: 'Cadastre os imóveis',
      status: nImoveis > 0 ? s(nImoveis, 'imóvel cadastrado', 'imóveis cadastrados') : 'Nenhum imóvel ainda',
      feito: nImoveis > 0,
    },
    {
      num: 2,
      href: '/contratos',
      titulo: 'Cadastre os aluguéis',
      status:
        nContratos > 0 ? s(nContratos, 'aluguel cadastrado', 'aluguéis cadastrados') : 'Nenhum aluguel ainda',
      feito: nContratos > 0,
    },
    {
      num: 3,
      href: '/pessoas',
      titulo: 'Cadastre os irmãos e os pesos',
      status:
        nIrmaos === 0
          ? 'Nenhum irmão ainda'
          : `${s(nIrmaos, 'irmão', 'irmãos')} · ${nComPeso} com pesos definidos`,
      feito: nIrmaos > 0 && nComPeso > 0,
    },
    {
      num: 4,
      href: '/cobrancas',
      titulo: 'Receba os aluguéis do mês',
      status:
        cobrancas.length === 0
          ? `Gere as cobranças de ${competenciaBR(competencia)}`
          : `${qtdPagas} de ${cobrancas.length} pagas em ${competenciaBR(competencia)}`,
      feito: cobrancas.length > 0 && qtdPagas === cobrancas.length,
    },
    {
      num: 5,
      href: '/divisao',
      titulo: 'Confira a divisão',
      status: irmaos.length > 0 ? 'Divisão calculada automaticamente' : 'Aguardando os passos anteriores',
      feito: irmaos.length > 0,
    },
    {
      num: 6,
      href: '/relatorios',
      titulo: 'Baixe os relatórios',
      status: 'Excel, PDF ou CSV',
      feito: false,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Início</h1>
      <p className="mt-1 text-sm text-gray-500">
        Siga os passos na ordem — o sistema calcula a divisão sozinho
      </p>

      {/* Guia do fluxo */}
      <section className="mt-6">
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {passos.map((p) => (
            <li key={p.num}>
              <Link
                href={p.href}
                className="flex h-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-700"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    p.feito
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {p.feito ? '✓' : p.num}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                    {p.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">{p.status}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* Aluguéis do mês */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
            Aluguéis de {competenciaBR(competencia)}
          </h2>
          <Link href="/cobrancas" className="text-sm text-emerald-600 hover:underline">
            Ver aluguéis →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card titulo="Previsto" valor={brl(previsto)} />
          <Card titulo="Recebido" valor={brl(recebido)} cor="emerald" />
          <Card titulo="Pendente" valor={brl(pendente)} cor="amber" />
          <Card titulo="Em atraso" valor={brl(atrasado)} cor="red" />
        </div>
      </section>

      {/* Divisão do mês */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">
            Divisão entre os irmãos
          </h2>
          <Link href="/divisao" className="text-sm text-emerald-600 hover:underline">
            Ver divisão →
          </Link>
        </div>
        <Tabela>
          <thead>
            <tr>
              <Th>Irmão</Th>
              <Th className="text-right">Recebe por mês</Th>
            </tr>
          </thead>
          <tbody>
            {irmaos.length === 0 && (
              <VazioTabela
                colunas={2}
                mensagem="A divisão aparece aqui quando houver aluguéis e pesos cadastrados."
              />
            )}
            {irmaos.map((i) => (
              <tr key={i.nome} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="font-medium text-gray-900 dark:text-gray-100">{i.nome}</Td>
                <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {brl(i.total)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </section>
    </div>
  )
}

const cores = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
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
      <p className={`mt-2 text-xl font-semibold ${cores[cor]}`}>{valor}</p>
    </div>
  )
}
