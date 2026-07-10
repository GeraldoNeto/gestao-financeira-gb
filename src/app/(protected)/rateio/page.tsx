import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela } from '@/components/ui'

export const dynamic = 'force-dynamic'

type RateioLinha = {
  id_rateio: number
  nome_empresa: string
  valor_total: number
  num_pessoas: number
  valor_individual: number
  valor_residual: number
  data: string
}

export default async function RateioPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_rateios')
    .select('id_rateio, nome_empresa, valor_total, num_pessoas, valor_individual, valor_residual, data')
    .order('id_rateio', { ascending: false })

  const rateios = (data as RateioLinha[] | null) ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Rateio"
        descricao="Distribuição automática de créditos entre pessoas físicas"
        acao={{ href: '/rateio/novo', label: '+ Novo rateio' }}
      />

      {error && <p className="mb-4 text-sm text-red-500">Erro ao carregar: {error.message}</p>}

      <Tabela>
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>Empresa</Th>
            <Th className="text-right">Valor total</Th>
            <Th className="text-right">Pessoas</Th>
            <Th className="text-right">Valor/cota</Th>
            <Th className="text-right">Resíduo</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rateios.length === 0 && (
            <VazioTabela colunas={7} mensagem="Nenhum rateio realizado ainda." />
          )}
          {rateios.map((r) => (
            <tr key={r.id_rateio} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td>{dataBR(r.data)}</Td>
              <Td className="font-medium text-gray-900 dark:text-gray-100">{r.nome_empresa}</Td>
              <Td className="text-right font-semibold">{brl(r.valor_total)}</Td>
              <Td className="text-right">{r.num_pessoas}</Td>
              <Td className="text-right">{brl(r.valor_individual)}</Td>
              <Td
                className={`text-right ${r.valor_residual > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}
              >
                {brl(r.valor_residual)}
              </Td>
              <Td className="text-right">
                <Link
                  href={`/rateio/${r.id_rateio}`}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Detalhes
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
