import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, BadgeStatus, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirPessoa } from './actions'

export const dynamic = 'force-dynamic'

export default async function IrmaosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('pessoas_fisicas')
    .select('id_pessoa, nome, status')
    .order('nome')

  const irmaos = (data as { id_pessoa: number; nome: string; status: 'ativo' | 'inativo' | 'pendente' }[] | null) ?? []

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        titulo="Irmãos"
        descricao="Cadastro dos irmãos (co-donos dos imóveis)"
        acao={{ href: '/pessoas/nova', label: '+ Novo irmão' }}
      />

      <Tabela>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>Status</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {irmaos.length === 0 && (
            <VazioTabela colunas={3} mensagem="Nenhum irmão cadastrado ainda." />
          )}
          {irmaos.map((p) => (
            <tr key={p.id_pessoa} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{p.nome}</Td>
              <Td>
                <BadgeStatus status={p.status} />
              </Td>
              <Td className="text-right">
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
