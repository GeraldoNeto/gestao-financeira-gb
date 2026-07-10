import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { Tabela, Th, Td, VazioTabela } from '@/components/ui'
import type { CobrancaView, DivisaoPrevista } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function InicioPage() {
  const supabase = await createClient()
  const competencia = `${mesAtual()}-01`
  const [{ data: cobrancasMes }, { data: divisao }] = await Promise.all([
    supabase.from('vw_cobrancas').select('valor, status, situacao').eq('competencia', competencia),
    supabase.from('vw_divisao_prevista').select('*'),
  ])

  const cobrancas = (cobrancasMes as Pick<CobrancaView, 'valor' | 'status' | 'situacao'>[] | null) ?? []
  const previsto = cobrancas.reduce((s, c) => s + Number(c.valor), 0)
  const recebido = cobrancas.filter((c) => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0)
  const pendente = previsto - recebido
  const atrasado = cobrancas.filter((c) => c.situacao === 'atrasado').reduce((s, c) => s + Number(c.valor), 0)

  const linhasDiv = (divisao as DivisaoPrevista[] | null) ?? []
  const porIrmao = new Map<number, { nome: string; total: number }>()
  for (const l of linhasDiv) {
    const a = porIrmao.get(l.id_pessoa) ?? { nome: l.nome_irmao, total: 0 }
    a.total += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, a)
  }
  const irmaos = [...porIrmao.values()].sort((a, b) => b.total - a.total)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Início</h1>
      <p className="mt-1 text-sm text-gray-500">Resumo dos aluguéis de {competenciaBR(competencia)}</p>

      {/* Aluguéis do mês */}
      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-400">Aluguéis do mês</h2>
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
                mensagem="Ainda não há aluguéis pagos neste mês (ou faltam os percentuais nos imóveis)."
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
