import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { Tabela, Th, Td, btnSecondary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirRateio, type RateioState } from '../actions'
import type { RateioView, RateioParticipante } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function RateioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const { data: rateioData } = await supabase
    .from('vw_rateios')
    .select('*')
    .eq('id_rateio', idNum)
    .single()

  const rateio = rateioData as RateioView | null
  if (!rateio) notFound()

  const { data: partData } = await supabase
    .from('rateio_participantes')
    .select('*')
    .eq('id_rateio', idNum)
    .order('id_participante')
  const participantes = (partData as RateioParticipante[] | null) ?? []

  const { data: pessoasData } = await supabase
    .from('pessoas_fisicas')
    .select('id_pessoa, nome')
    .in('id_pessoa', participantes.length ? participantes.map((p) => p.id_pessoa) : [-1])
  const nomes = new Map(
    ((pessoasData as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => [
      p.id_pessoa,
      p.nome,
    ]),
  )

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/rateio" className="text-sm text-emerald-600 hover:underline">
            ← Voltar aos rateios
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Rateio #{rateio.id_rateio}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {rateio.nome_empresa} · {dataBR(rateio.data)}
          </p>
        </div>
        <ExcluirButton
          action={excluirRateio.bind(null, rateio.id_rateio) as () => Promise<RateioState>}
          confirmText={`Excluir o rateio #${rateio.id_rateio}? Os ${rateio.num_pessoas} créditos gerados também serão removidos.`}
        />
      </div>

      {/* Resumo */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Resumo rotulo="Valor total" valor={brl(rateio.valor_total)} />
        <Resumo rotulo="Participantes" valor={String(rateio.num_pessoas)} />
        <Resumo rotulo="Valor por cota" valor={brl(rateio.valor_individual)} cor="emerald" />
        <Resumo
          rotulo="Resíduo"
          valor={brl(rateio.valor_residual)}
          cor={rateio.valor_residual > 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Participantes */}
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">
        Créditos gerados
      </h2>
      <Tabela>
        <thead>
          <tr>
            <Th>Pessoa</Th>
            <Th className="text-right">%</Th>
            <Th className="text-right">Valor creditado</Th>
            <Th>Observação</Th>
          </tr>
        </thead>
        <tbody>
          {participantes.map((p) => (
            <tr key={p.id_participante} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">
                {nomes.get(p.id_pessoa) ?? `#${p.id_pessoa}`}
              </Td>
              <Td className="text-right">
                {p.percentual < 100 ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    {p.percentual}%
                  </span>
                ) : (
                  <span className="text-gray-400">100%</span>
                )}
              </Td>
              <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(p.valor)}
              </Td>
              <Td>
                {p.recebeu_residual && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    inclui resíduo
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      <div className="mt-6">
        <Link href="/creditos?tipo=pessoa" className={btnSecondary}>
          Ver créditos das pessoas
        </Link>
      </div>
    </div>
  )
}

function Resumo({
  rotulo,
  valor,
  cor = 'gray',
}: {
  rotulo: string
  valor: string
  cor?: 'gray' | 'emerald' | 'amber'
}) {
  const cores = {
    gray: 'text-gray-900 dark:text-gray-100',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500">{rotulo}</p>
      <p className={`mt-1 text-lg font-semibold ${cores[cor]}`}>{valor}</p>
    </div>
  )
}
