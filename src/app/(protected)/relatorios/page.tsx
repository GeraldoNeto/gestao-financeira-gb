import { createClient } from '@/lib/supabase/server'
import { Tabela, Th, Td, VazioTabela, inputClass, btnPrimary } from '@/components/ui'
import { dataBR } from '@/lib/format'
import {
  RELATORIOS,
  buildRelatorio,
  isRelatorioId,
  fmtCell,
  type RelatorioId,
} from './data'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; de?: string; ate?: string }>
}) {
  const sp = await searchParams
  const tipo: RelatorioId = sp.tipo && isRelatorioId(sp.tipo) ? sp.tipo : 'empresas'
  const de = sp.de || ''
  const ate = sp.ate || ''

  const supabase = await createClient()
  const rel = await buildRelatorio(supabase, tipo, de || undefined, ate || undefined)

  const qs = new URLSearchParams({ tipo, ...(de ? { de } : {}), ...(ate ? { ate } : {}) })
  const exportHref = (formato: string) => `/relatorios/export?${qs}&formato=${formato}`

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">Consulte e exporte os dados financeiros</p>
      </div>

      {/* Filtro (GET) */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Relatório
          </span>
          <select name="tipo" defaultValue={tipo} className={inputClass}>
            {RELATORIOS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            De
          </span>
          <input type="date" name="de" defaultValue={de} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Até
          </span>
          <input type="date" name="ate" defaultValue={ate} className={inputClass} />
        </label>
        <button type="submit" className={btnPrimary}>
          Gerar
        </button>
      </form>

      {/* Cabeçalho do resultado + exportação */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{rel.titulo}</h2>
          <p className="text-xs text-gray-500">
            {rel.linhas.length} registro{rel.linhas.length === 1 ? '' : 's'}
            {rel.usaPeriodo && (de || ate) && (
              <> · período {de ? dataBR(de) : '…'} a {ate ? dataBR(ate) : '…'}</>
            )}
            {rel.usaPeriodo && !de && !ate && <> · todos os períodos</>}
          </p>
        </div>
        <div className="flex gap-2">
          <ExportLink href={exportHref('csv')} label="CSV" />
          <ExportLink href={exportHref('xlsx')} label="Excel" />
          <ExportLink href={exportHref('pdf')} label="PDF" />
        </div>
      </div>

      <Tabela>
        <thead>
          <tr>
            {rel.colunas.map((c) => (
              <Th key={c.key} className={c.tipo === 'money' || c.tipo === 'number' ? 'text-right' : ''}>
                {c.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rel.linhas.length === 0 && (
            <VazioTabela colunas={rel.colunas.length} mensagem="Nenhum dado para este relatório." />
          )}
          {rel.linhas.map((linha, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              {rel.colunas.map((c) => (
                <Td
                  key={c.key}
                  className={c.tipo === 'money' || c.tipo === 'number' ? 'text-right' : ''}
                >
                  {fmtCell(linha[c.key], c.tipo)}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}

function ExportLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
    >
      {label}
    </a>
  )
}
