import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, BadgeStatus, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirPessoa } from './actions'
import type { SaldoPessoa } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function PessoasPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('vw_saldo_pessoa').select('*').order('nome')

  const pessoas = (data as SaldoPessoa[] | null) ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Irmãos"
        descricao="Cadastro dos irmãos (co-donos) e seus saldos"
        acao={{ href: '/pessoas/nova', label: '+ Novo irmão' }}
      />

      {error && <p className="mb-4 text-sm text-red-500">Erro ao carregar: {error.message}</p>}

      <Tabela>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Status</Th>
            <Th className="text-right">Créditos</Th>
            <Th className="text-right">Débitos</Th>
            <Th className="text-right">Saldo</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {pessoas.length === 0 && (
            <VazioTabela colunas={6} mensagem="Nenhuma pessoa cadastrada ainda." />
          )}
          {pessoas.map((p) => (
            <tr key={p.id_pessoa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{p.nome}</Td>
              <Td>
                <BadgeStatus status={p.status} />
              </Td>
              <Td className="text-right text-emerald-600 dark:text-emerald-400">
                {brl(p.total_creditos)}
              </Td>
              <Td className="text-right text-red-600 dark:text-red-400">{brl(p.total_debitos)}</Td>
              <Td className="text-right font-semibold">{brl(p.saldo)}</Td>
              <Td className="text-right">
                <Link
                  href={`/extrato?tipo=pessoa&id=${p.id_pessoa}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Extrato
                </Link>
                <Link
                  href={`/pessoas/${p.id_pessoa}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Editar
                </Link>
                <ExcluirButton
                  action={excluirPessoa.bind(null, p.id_pessoa)}
                  confirmText={`Excluir "${p.nome}"?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
