import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, Td, BadgeStatus, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirImovel } from './actions'
import type { Imovel } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function ImoveisPage() {
  const supabase = await createClient()
  const [{ data: imoveis }, { data: contratos }] = await Promise.all([
    supabase.from('imoveis').select('*').order('nome'),
    supabase.from('contratos').select('id_imovel, status'),
  ])

  const lista = (imoveis as Imovel[] | null) ?? []
  const contratosPorImovel = new Map<number, number>()
  for (const c of (contratos as { id_imovel: number; status: string }[] | null) ?? []) {
    if (c.status === 'ativo')
      contratosPorImovel.set(c.id_imovel, (contratosPorImovel.get(c.id_imovel) ?? 0) + 1)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Imóveis"
        descricao="Cadastro dos imóveis alugados"
        acao={{ href: '/imoveis/nova', label: '+ Novo imóvel' }}
      />

      <Tabela>
        <thead>
          <tr>
            <Th>Imóvel</Th>
            <Th>Endereço</Th>
            <Th>Status</Th>
            <Th className="text-right">Aluguéis</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && <VazioTabela colunas={5} mensagem="Nenhum imóvel cadastrado ainda." />}
          {lista.map((i) => (
            <tr key={i.id_imovel} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{i.nome}</Td>
              <Td className="text-gray-500">{i.endereco ?? '—'}</Td>
              <Td>
                <BadgeStatus status={i.status} />
              </Td>
              <Td className="text-right">{contratosPorImovel.get(i.id_imovel) ?? 0}</Td>
              <Td className="text-right">
                <Link
                  href={`/imoveis/${i.id_imovel}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Abrir
                </Link>
                <ExcluirButton
                  action={excluirImovel.bind(null, i.id_imovel)}
                  confirmText={`Excluir o imóvel "${i.nome}"?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
