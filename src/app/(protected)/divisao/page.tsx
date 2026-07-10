import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnSecondary } from '@/components/ui'
import type { DivisaoAluguel } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function DivisaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const sp = await searchParams
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : mesAtual()
  const competencia = `${mes}-01`

  const supabase = await createClient()
  const { data } = await supabase
    .from('vw_divisao_alugueis')
    .select('*')
    .eq('competencia', competencia)
    .order('nome_imovel')
    .order('nome_irmao')
  const linhas = (data as DivisaoAluguel[] | null) ?? []

  // Total por irmão
  const porIrmao = new Map<number, { nome: string; total: number }>()
  for (const l of linhas) {
    const atual = porIrmao.get(l.id_pessoa) ?? { nome: l.nome_irmao, total: 0 }
    atual.total += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, atual)
  }
  const irmaos = [...porIrmao.values()].sort((a, b) => b.total - a.total)
  const totalMes = linhas.reduce((s, l) => s + Number(l.valor_irmao), 0)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Divisão dos aluguéis"
        descricao={`Quanto cada irmão recebe do aluguel pago em ${competenciaBR(competencia)}`}
      />

      <form method="get" className="mb-6 flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Competência (mês)
          </span>
          <input type="month" name="mes" defaultValue={mes} className={inputClass} />
        </label>
        <button type="submit" className={btnSecondary}>
          Ver
        </button>
      </form>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">Total de aluguel recebido no mês</p>
        <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
          {brl(totalMes)}
        </p>
      </div>

      {/* Por irmão */}
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">Por irmão</h2>
      <Tabela>
        <thead>
          <tr>
            <Th>Irmão</Th>
            <Th className="text-right">Total no mês</Th>
          </tr>
        </thead>
        <tbody>
          {irmaos.length === 0 && (
            <VazioTabela
              colunas={2}
              mensagem="Nenhum aluguel recebido neste mês (ou faltam percentuais nos imóveis)."
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

      {/* Detalhe por imóvel */}
      {linhas.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-gray-400">
            Detalhe por imóvel
          </h2>
          <Tabela>
            <thead>
              <tr>
                <Th>Imóvel</Th>
                <Th>Irmão</Th>
                <Th className="text-right">%</Th>
                <Th className="text-right">Aluguel recebido</Th>
                <Th className="text-right">Parte do irmão</Th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={`${l.id_cobranca}-${l.id_pessoa}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <Td className="font-medium text-gray-900 dark:text-gray-100">{l.nome_imovel}</Td>
                  <Td>{l.nome_irmao}</Td>
                  <Td className="text-right">{l.percentual}%</Td>
                  <Td className="text-right text-gray-500">{brl(l.valor_recebido)}</Td>
                  <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {brl(l.valor_irmao)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </>
      )}
    </div>
  )
}
