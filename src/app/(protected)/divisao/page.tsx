import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, inputClass, btnSecondary } from '@/components/ui'
import type { DivisaoAluguel, DivisaoPrevista } from '@/lib/database.types'

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
  const [{ data: prevista }, { data: recebida }, { data: despesas }] = await Promise.all([
    supabase.from('vw_divisao_prevista').select('*').order('nome_imovel').order('nome_irmao'),
    supabase.from('vw_divisao_alugueis').select('id_pessoa, valor_irmao').eq('competencia', competencia),
    supabase.from('despesas_mes').select('valor').eq('competencia', competencia),
  ])

  const linhasPrev = (prevista as DivisaoPrevista[] | null) ?? []
  const linhasReceb = (recebida as Pick<DivisaoAluguel, 'id_pessoa' | 'valor_irmao'>[] | null) ?? []
  const gastos = ((despesas as { valor: number }[] | null) ?? []).reduce(
    (s, d) => s + Number(d.valor),
    0,
  )

  // Consolida por irmão: previsto/mês (dos valores cadastrados) e recebido no mês
  const porIrmao = new Map<number, { nome: string; previsto: number; recebido: number }>()
  for (const l of linhasPrev) {
    const a = porIrmao.get(l.id_pessoa) ?? { nome: l.nome_irmao, previsto: 0, recebido: 0 }
    a.previsto += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, a)
  }
  for (const l of linhasReceb) {
    const a = porIrmao.get(l.id_pessoa) ?? { nome: '', previsto: 0, recebido: 0 }
    a.recebido += Number(l.valor_irmao)
    porIrmao.set(l.id_pessoa, a)
  }

  const totalPrevisto = linhasPrev.reduce((s, l) => s + Number(l.valor_irmao), 0)
  const totalRecebido = linhasReceb.reduce((s, l) => s + Number(l.valor_irmao), 0)
  const totalLiquido = totalRecebido - gastos

  // Líquido por irmão: gastos do mês descontados proporcionalmente ao recebido
  const round2 = (n: number) => Math.round(n * 100) / 100
  const irmaos = [...porIrmao.entries()]
    .map(([id, i]) => ({
      id,
      ...i,
      liquido:
        totalRecebido > 0 ? round2(i.recebido - gastos * (i.recebido / totalRecebido)) : 0,
      detalhes: linhasPrev.filter((l) => l.id_pessoa === id),
    }))
    .sort((a, b) => b.previsto - a.previsto)

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Divisão dos aluguéis"
        descricao="Quanto cada irmão recebe — calculado automaticamente do valor dos aluguéis"
      />

      <form method="get" className="mb-6 flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mês (para o recebido)
          </span>
          <input type="month" name="mes" defaultValue={mes} className={inputClass} />
        </label>
        <button type="submit" className={btnSecondary}>
          Ver
        </button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Previsto por mês</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {brl(totalPrevisto)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Recebido em {competenciaBR(competencia)}</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {brl(totalRecebido)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Gastos do mês</p>
          <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400">
            −{brl(gastos)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Líquido a dividir</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {brl(totalLiquido)}
          </p>
        </div>
      </div>

      {/* Por irmão (sanfona: clique para ver o detalhe por imóvel) */}
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-400">Por irmão</h2>
      <p className="mb-3 text-sm text-gray-500">
        Clique no irmão para ver o detalhe por imóvel (previsto por mês)
      </p>

      {irmaos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Cadastre o valor dos aluguéis e os pesos dos irmãos.
        </div>
      )}

      <div className="space-y-2">
        {/* Cabeçalho das colunas */}
        {irmaos.length > 0 && (
          <div className="grid grid-cols-2 gap-2 px-4 text-xs font-medium uppercase tracking-wide text-gray-400 sm:grid-cols-[1fr_repeat(3,8.5rem)_1.5rem]">
            <span>Irmão</span>
            <span className="hidden text-right sm:block">Previsto por mês</span>
            <span className="hidden text-right sm:block">Recebido no mês</span>
            <span className="text-right">Líquido (após gastos)</span>
            <span className="hidden sm:block" />
          </div>
        )}

        {irmaos.map((i) => (
          <details
            key={i.id}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <summary className="grid cursor-pointer list-none grid-cols-2 items-center gap-2 rounded-xl px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-gray-800/40 sm:grid-cols-[1fr_repeat(3,8.5rem)_1.5rem] [&::-webkit-details-marker]:hidden">
            <span className="font-medium text-gray-900 dark:text-gray-100">{i.nome}</span>
              <span className="hidden text-right text-sm text-gray-500 sm:block">
                {brl(i.previsto)}
              </span>
              <span className="hidden text-right text-sm text-gray-500 sm:block">
                {brl(i.recebido)}
              </span>
              <span className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(i.liquido)}
              </span>
              <span
                aria-hidden
                className="hidden justify-self-end text-gray-400 transition-transform group-open:rotate-180 sm:block"
              >
                ▾
              </span>
            </summary>

            <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Detalhe por imóvel (previsto por mês)
              </p>
              {i.detalhes.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Este irmão ainda não recebe de nenhum aluguel.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {i.detalhes.map((l) => (
                    <li
                      key={`${l.id_contrato}-${l.id_pessoa}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="min-w-0 font-medium text-gray-900 dark:text-gray-100">
                        {l.nome_imovel}
                        {l.unidade ? <span className="text-gray-500"> · {l.unidade}</span> : ''}
                      </span>
                      <span className="flex items-center gap-4">
                        <span className="text-gray-500">
                          {brl(l.valor_mensal)} × {Number(l.percentual)}%
                        </span>
                        <span className="w-24 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {brl(l.valor_irmao)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
