import { createClient } from '@/lib/supabase/server'
import { brl, competenciaBR, mesAtual } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnSecondary } from '@/components/ui'
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
  const irmaos = [...porIrmao.values()]
    .map((i) => ({
      ...i,
      liquido:
        totalRecebido > 0 ? round2(i.recebido - gastos * (i.recebido / totalRecebido)) : 0,
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

      {/* Por irmão */}
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-400">Por irmão</h2>
      <Tabela>
        <thead>
          <tr>
            <Th>Irmão</Th>
            <Th className="text-right">Previsto por mês</Th>
            <Th className="text-right">Recebido no mês</Th>
            <Th className="text-right">Líquido no mês (após gastos)</Th>
          </tr>
        </thead>
        <tbody>
          {irmaos.length === 0 && (
            <VazioTabela
              colunas={4}
              mensagem="Cadastre o valor dos aluguéis e os percentuais dos irmãos nos imóveis."
            />
          )}
          {irmaos.map((i) => (
            <tr key={i.nome} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{i.nome}</Td>
              <Td className="text-right text-gray-500">{brl(i.previsto)}</Td>
              <Td className="text-right text-gray-500">{brl(i.recebido)}</Td>
              <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(i.liquido)}
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>

      {/* Detalhe por imóvel */}
      {linhasPrev.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-gray-400">
            Detalhe por imóvel (previsto por mês)
          </h2>
          <Tabela>
            <thead>
              <tr>
                <Th>Imóvel / unidade</Th>
                <Th>Irmão</Th>
                <Th className="text-right">%</Th>
                <Th className="text-right">Aluguel</Th>
                <Th className="text-right">Parte do irmão</Th>
              </tr>
            </thead>
            <tbody>
              {linhasPrev.map((l) => (
                <tr key={`${l.id_contrato}-${l.id_pessoa}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <Td className="font-medium text-gray-900 dark:text-gray-100">
                    {l.nome_imovel}
                    {l.unidade ? <span className="text-gray-500"> · {l.unidade}</span> : ''}
                  </Td>
                  <Td>{l.nome_irmao}</Td>
                  <Td className="text-right">{l.percentual}%</Td>
                  <Td className="text-right text-gray-500">{brl(l.valor_mensal)}</Td>
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
