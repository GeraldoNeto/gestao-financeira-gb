import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { Tabela, Th, Td, VazioTabela, btnSecondary } from '@/components/ui'
import type { ExtratoLinha } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function ExtratoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; id?: string }>
}) {
  const sp = await searchParams
  const tipo = sp.tipo === 'pessoa' ? 'pessoa' : 'empresa'
  const id = Number(sp.id)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const supabase = await createClient()

  const nome =
    tipo === 'empresa'
      ? ((
          await supabase.from('empresas').select('nome_empresa').eq('id_empresa', id).single()
        ).data?.nome_empresa ?? null)
      : ((await supabase.from('pessoas_fisicas').select('nome').eq('id_pessoa', id).single()).data
          ?.nome ?? null)

  if (!nome) notFound()

  const { data } = await (tipo === 'empresa'
    ? supabase
        .from('vw_extrato_empresa')
        .select('*')
        .eq('id_empresa', id)
        .order('data')
        .order('data_lancamento')
    : supabase
        .from('vw_extrato_pessoa')
        .select('*')
        .eq('id_pessoa', id)
        .order('data')
        .order('data_lancamento'))

  const movimentos = (data as ExtratoLinha[] | null) ?? []

  // saldo corrente acumulado (valor já vem com sinal: crédito +, débito −)
  let saldo = 0
  const linhas = movimentos.map((m) => {
    saldo = Math.round((saldo + Number(m.valor)) * 100) / 100
    return { ...m, saldo }
  })

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href={tipo === 'empresa' ? '/empresas' : '/pessoas'}
          className="text-sm text-emerald-600 hover:underline"
        >
          ← Voltar
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Extrato — {nome}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {tipo === 'empresa' ? 'Empresa' : 'Pessoa física'} · saldo atual{' '}
          <span
            className={`font-semibold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {brl(saldo)}
          </span>
        </p>
      </div>

      <Tabela>
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>Tipo</Th>
            <Th>Histórico</Th>
            <Th className="text-right">Valor</Th>
            <Th className="text-right">Saldo</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <VazioTabela colunas={5} mensagem="Nenhuma movimentação registrada." />
          )}
          {linhas.map((l, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td>{dataBR(l.data)}</Td>
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
              <Td>{l.historico ?? '—'}</Td>
              <Td
                className={`text-right font-medium ${l.valor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {brl(l.valor)}
              </Td>
              <Td className="text-right font-semibold">{brl(l.saldo)}</Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      <div className="mt-6">
        <Link href={`/relatorios?tipo=${tipo === 'empresa' ? 'creditos' : 'creditos'}`} className={btnSecondary}>
          Ir para relatórios
        </Link>
      </div>
    </div>
  )
}
