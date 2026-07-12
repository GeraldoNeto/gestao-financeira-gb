import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, BadgeStatus, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirEmpresa } from './actions'
import type { SaldoEmpresa } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EmpresasPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_saldo_empresa')
    .select('*')
    .order('nome_empresa')

  const empresas = (data as SaldoEmpresa[] | null) ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Empresas"
        descricao="Cadastro e saldos das empresas (inclui as reservas)"
        acao={{ href: '/empresas/nova', label: '+ Nova empresa' }}
      />

      {error && <p className="mb-4 text-sm text-red-500">Erro ao carregar: {error.message}</p>}

      <Tabela>
        <thead>
          <tr>
            <Th>Empresa</Th>
            <Th>Status</Th>
            <Th className="text-right">Créditos</Th>
            <Th className="text-right">Débitos</Th>
            <Th className="text-right">Saldo</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {empresas.length === 0 && (
            <VazioTabela colunas={6} mensagem="Nenhuma empresa cadastrada ainda." />
          )}
          {empresas.map((e) => (
            <tr key={e.id_empresa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{e.nome_empresa}</Td>
              <Td>
                <BadgeStatus status={e.status} />
              </Td>
              <Td className="text-right text-emerald-600 dark:text-emerald-400">
                {brl(e.total_creditos)}
              </Td>
              <Td className="text-right text-red-600 dark:text-red-400">{brl(e.total_debitos)}</Td>
              <Td className="text-right font-semibold">{brl(e.saldo)}</Td>
              <Td className="text-right">
                <Link
                  href={`/extrato?tipo=empresa&id=${e.id_empresa}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Extrato
                </Link>
                <Link
                  href={`/empresas/${e.id_empresa}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Editar
                </Link>
                <ExcluirButton
                  action={excluirEmpresa.bind(null, e.id_empresa)}
                  confirmText={`Excluir a empresa "${e.nome_empresa}"?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
