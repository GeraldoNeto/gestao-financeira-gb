import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnSecondary } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { NovaContaForm } from './nova-conta-form'
import { excluirConta } from './actions'
import type { ContaIrmaos } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const round2 = (n: number) => Math.round(n * 100) / 100

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string }>
}) {
  const sp = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : mesAtual()
  const competencia = `${mes}-01`

  const supabase = await createClient()
  const [{ data: contasData }, { data: pessoas }] = await Promise.all([
    supabase.from('contas_irmaos').select('*').eq('competencia', competencia).order('id_conta'),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
  ])

  const contas = (contasData as ContaIrmaos[] | null) ?? []
  const listaIrmaos = ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id_pessoa,
    nome: p.nome,
  }))
  const nomePorId = new Map(listaIrmaos.map((i) => [i.id, i.nome]))

  // Saldo por irmão no mês: a receber (origem) − a pagar (destino)
  const saldo = new Map<number, { aReceber: number; aPagar: number }>()
  for (const c of contas) {
    const o = saldo.get(c.id_origem) ?? { aReceber: 0, aPagar: 0 }
    o.aReceber += Number(c.valor_brl)
    saldo.set(c.id_origem, o)
    const d = saldo.get(c.id_destino) ?? { aReceber: 0, aPagar: 0 }
    d.aPagar += Number(c.valor_brl)
    saldo.set(c.id_destino, d)
  }
  const saldos = [...saldo.entries()]
    .map(([id, s]) => ({
      id,
      nome: nomePorId.get(id) ?? `#${id}`,
      aReceber: round2(s.aReceber),
      aPagar: round2(s.aPagar),
      saldo: round2(s.aReceber - s.aPagar),
    }))
    .sort((a, b) => b.saldo - a.saldo)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Contas entre irmãos"
        descricao="Compensações entre os irmãos (crédito/débito) — o saldo entra no “A transferir” do mês"
      />

      <form method="get" className="mb-6 flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Mês</span>
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

      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Nova operação</h2>
      <p className="mb-3 text-sm text-gray-500">
        Quem <strong>pagou/adiantou</strong> fica a receber; quem se <strong>beneficiou</strong> fica
        devendo.
      </p>
      <NovaContaForm mes={mes} irmaos={listaIrmaos} />

      {/* Saldo por irmão */}
      <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-gray-400">
        Saldo entre irmãos em {competenciaBR(competencia)}
      </h2>
      <Tabela>
        <thead>
          <tr>
            <Th>Irmão</Th>
            <Th className="text-right">A receber</Th>
            <Th className="text-right">A pagar</Th>
            <Th className="text-right">Saldo</Th>
          </tr>
        </thead>
        <tbody>
          {saldos.length === 0 && (
            <VazioTabela colunas={4} mensagem="Nenhuma operação neste mês." />
          )}
          {saldos.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{s.nome}</Td>
              <Td className="text-right text-emerald-600 dark:text-emerald-400">{brl(s.aReceber)}</Td>
              <Td className="text-right text-red-600 dark:text-red-400">{brl(s.aPagar)}</Td>
              <Td
                className={`text-right font-semibold ${
                  s.saldo >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {brl(s.saldo)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      {/* Histórico de operações */}
      <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-gray-400">
        Operações de {competenciaBR(competencia)}
      </h2>
      <Tabela>
        <thead>
          <tr>
            <Th>De (credor)</Th>
            <Th>Para (devedor)</Th>
            <Th>Descrição</Th>
            <Th className="text-right">Valor</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {contas.length === 0 && (
            <VazioTabela colunas={5} mensagem="Nenhuma operação registrada neste mês." />
          )}
          {contas.map((c) => (
            <tr key={c.id_conta} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">
                {nomePorId.get(c.id_origem) ?? `#${c.id_origem}`}
              </Td>
              <Td>{nomePorId.get(c.id_destino) ?? `#${c.id_destino}`}</Td>
              <Td>{c.descricao}</Td>
              <Td className="text-right font-semibold">{brl(c.valor_brl)}</Td>
              <Td className="text-right">
                <span className="inline-flex items-center gap-1">
                  <Link
                    href={`/contas/${c.id_conta}?mes=${mes}`}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    Editar
                  </Link>
                  <ExcluirButton
                    action={excluirConta.bind(null, c.id_conta)}
                    confirmText={`Excluir a operação "${c.descricao}" (${brl(c.valor_brl)})?`}
                  />
                </span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
