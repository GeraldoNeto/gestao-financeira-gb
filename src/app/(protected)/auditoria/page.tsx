import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, VazioTabela, inputClass, btnPrimary } from '@/components/ui'
import type { LogAuditoria } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

const TABELAS = [
  'empresas',
  'pessoas_fisicas',
  'creditos_empresa',
  'debitos_empresa',
  'creditos_pessoa',
  'debitos_pessoa',
  'rateios',
]

const opBadge: Record<string, string> = {
  INSERT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ tabela?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('perfis').select('perfil').eq('id', user!.id).single()
  if (me?.perfil !== 'administrador') redirect('/dashboard')

  const { tabela } = await searchParams
  const filtro = tabela && TABELAS.includes(tabela) ? tabela : ''

  let q = supabase
    .from('logs_auditoria')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(200)
  if (filtro) q = q.eq('tabela', filtro)
  const { data } = await q
  const logs = (data as LogAuditoria[] | null) ?? []

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Auditoria" descricao="Histórico das operações registradas no sistema" />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tabela
          </span>
          <select name="tabela" defaultValue={filtro} className={inputClass}>
            <option value="">Todas</option>
            {TABELAS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={btnPrimary}>
          Filtrar
        </button>
      </form>

      <p className="mb-3 text-xs text-gray-500">
        {logs.length} registro{logs.length === 1 ? '' : 's'} (200 mais recentes)
      </p>

      <Tabela>
        <thead>
          <tr>
            <Th>Data/hora</Th>
            <Th>Tabela</Th>
            <Th>Operação</Th>
            <Th>Registro</Th>
            <Th>Usuário</Th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 && <VazioTabela colunas={5} mensagem="Nenhum registro de auditoria." />}
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="whitespace-nowrap text-gray-500">
                {new Date(l.criado_em).toLocaleString('pt-BR')}
              </Td>
              <Td className="font-medium text-gray-900 dark:text-gray-100">{l.tabela}</Td>
              <Td>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${opBadge[l.operacao] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}
                >
                  {l.operacao}
                </span>
              </Td>
              <Td className="text-gray-500">{l.registro_id ?? '—'}</Td>
              <Td className="text-gray-500">{l.usuario ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
