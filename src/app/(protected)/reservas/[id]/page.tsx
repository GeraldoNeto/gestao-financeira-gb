import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PageHeader, Tabela, Th, Td, VazioTabela, btnSecondary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { brl, dataBR } from '@/lib/format'
import { MovimentoForm } from './movimento-form'
import { alterarStatusReserva, excluirReserva, excluirMovimento } from '../actions'
import type { ReservaMovimento } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type ReservaRow = {
  id_reserva: number
  descricao: string
  valor_inicial: number
  saldo: number
  status: 'ativa' | 'encerrada'
  id_empresa: number
  empresas: { nome_empresa: string } | null
}

function horaBR(iso: string): string {
  return `${dataBR(iso)} ${iso.slice(11, 16)}`
}

export default async function ReservaDetalhePage({
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
  const [{ data }, { data: movs }] = await Promise.all([
    supabase
      .from('reservas')
      .select('id_reserva, descricao, valor_inicial, saldo, status, id_empresa, empresas(nome_empresa)')
      .eq('id_reserva', idNum)
      .single(),
    supabase
      .from('reserva_movimentos')
      .select('*')
      .eq('id_reserva', idNum)
      .order('id_movimento', { ascending: false }),
  ])

  const reserva = data as ReservaRow | null
  if (!reserva) notFound()
  const movimentos = (movs as ReservaMovimento[] | null) ?? []
  const ativa = reserva.status === 'ativa'

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <PageHeader
          titulo={reserva.descricao}
          descricao={`Reserva de ${reserva.empresas?.nome_empresa ?? `#${reserva.id_empresa}`}`}
          voltar="/reservas"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card titulo="Valor inicial" valor={brl(reserva.valor_inicial)} />
          <Card
            titulo="Créditos"
            valor={brl(movimentos.filter((m) => m.tipo === 'CREDITO').reduce((s, m) => s + Number(m.valor), 0))}
            cor="emerald"
          />
          <Card
            titulo="Débitos"
            valor={brl(movimentos.filter((m) => m.tipo === 'DEBITO').reduce((s, m) => s + Number(m.valor), 0))}
            cor="red"
          />
          <Card titulo="Saldo disponível" valor={brl(reserva.saldo)} cor={reserva.saldo < 0 ? 'red' : 'emerald'} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              ativa
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {ativa ? 'Ativa' : 'Encerrada'}
          </span>
          <form action={alterarStatusReserva.bind(null, reserva.id_reserva, ativa)}>
            <button type="submit" className={btnSecondary}>
              {ativa ? 'Encerrar reserva' : 'Reabrir reserva'}
            </button>
          </form>
          <ExcluirButton
            action={excluirReserva.bind(null, reserva.id_reserva)}
            confirmText={`Excluir a reserva "${reserva.descricao}" e todo o histórico?`}
          />
        </div>

        {sp.erro && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {sp.erro}
          </p>
        )}
      </div>

      {/* Nova movimentação */}
      {ativa ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Nova movimentação
          </h2>
          <MovimentoForm idReserva={reserva.id_reserva} />
        </div>
      ) : (
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800/40">
          Reserva encerrada — reabra para registrar novas movimentações.
        </p>
      )}

      {/* Histórico */}
      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
          Histórico de movimentações
        </h2>
        <Tabela>
          <thead>
            <tr>
              <Th>Data e hora</Th>
              <Th>Descrição</Th>
              <Th>Usuário</Th>
              <Th className="text-right">Crédito</Th>
              <Th className="text-right">Débito</Th>
              <Th className="text-right">Saldo</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {movimentos.length === 0 && (
              <VazioTabela colunas={7} mensagem="Sem movimentações." />
            )}
            {movimentos.map((m) => (
              <tr key={m.id_movimento} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <Td className="text-gray-500">{horaBR(m.criado_em)}</Td>
                <Td className="font-medium text-gray-900 dark:text-gray-100">{m.descricao}</Td>
                <Td className="text-gray-500">{m.usuario ?? '—'}</Td>
                <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                  {m.tipo === 'CREDITO' ? brl(m.valor) : brl(0)}
                </Td>
                <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                  {m.tipo === 'DEBITO' ? brl(m.valor) : brl(0)}
                </Td>
                <Td className="text-right font-semibold">{brl(m.saldo_apos)}</Td>
                <Td className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`/reservas/movimento/${m.id_movimento}`}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                    >
                      Editar
                    </Link>
                    <ExcluirButton
                      action={excluirMovimento.bind(null, m.id_movimento)}
                      confirmText={`Excluir "${m.descricao}" (${brl(m.valor)})? Os saldos serão recalculados.`}
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

function Card({ titulo, valor, cor = 'gray' }: { titulo: string; valor: string; cor?: keyof typeof cores }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-500">{titulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cores[cor]}`}>{valor}</p>
    </div>
  )
}
