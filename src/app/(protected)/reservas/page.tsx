import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela } from '@/components/ui'

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

export default async function ReservasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reservas')
    .select('id_reserva, descricao, valor_inicial, saldo, status, id_empresa, empresas(nome_empresa)')
    .order('status')
    .order('id_reserva', { ascending: false })

  const reservas = (data as ReservaRow[] | null) ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Reservas de valores"
        descricao="Fundos por empresa (crédito inicial, débitos de uso e saldo)"
        acao={{ href: '/reservas/nova', label: '+ Nova reserva' }}
      />

      <Tabela>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Finalidade</Th>
            <Th className="text-right">Valor inicial</Th>
            <Th className="text-right">Saldo</Th>
            <Th>Status</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {reservas.length === 0 && (
            <VazioTabela colunas={6} mensagem="Nenhuma reserva cadastrada ainda." />
          )}
          {reservas.map((r) => (
            <tr key={r.id_reserva} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">
                {r.empresas?.nome_empresa ?? `#${r.id_empresa}`}
              </Td>
              <Td>{r.descricao}</Td>
              <Td className="text-right text-gray-500">{brl(r.valor_inicial)}</Td>
              <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(r.saldo)}
              </Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.status === 'ativa'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {r.status === 'ativa' ? 'Ativa' : 'Encerrada'}
                </span>
              </Td>
              <Td className="text-right">
                <Link
                  href={`/reservas/${r.id_reserva}`}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Abrir
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
