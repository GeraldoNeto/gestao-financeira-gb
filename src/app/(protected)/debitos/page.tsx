import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela } from '@/components/ui'
import { TabsTipo } from '@/components/tabs-tipo'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirDebito, type TipoEntidade } from './actions'
import type { DebitoEmpresa, DebitoPessoa } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type Linha = {
  id: number
  data: string
  nome: string
  historico: string | null
  valor: number
  usuario: string | null
}

export default async function DebitosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const { tipo: tipoParam } = await searchParams
  const tipo: TipoEntidade = tipoParam === 'pessoa' ? 'pessoa' : 'empresa'

  const supabase = await createClient()
  let linhas: Linha[] = []

  if (tipo === 'empresa') {
    const [{ data: debitos }, { data: empresas }] = await Promise.all([
      supabase
        .from('debitos_empresa')
        .select('*')
        .order('data_debito', { ascending: false })
        .order('id_debito', { ascending: false })
        .limit(200),
      supabase.from('empresas').select('id_empresa, nome_empresa'),
    ])
    const nomes = new Map(
      ((empresas as { id_empresa: number; nome_empresa: string }[] | null) ?? []).map((e) => [
        e.id_empresa,
        e.nome_empresa,
      ]),
    )
    linhas = ((debitos as DebitoEmpresa[] | null) ?? []).map((d) => ({
      id: d.id_debito,
      data: d.data_debito,
      nome: nomes.get(d.id_empresa) ?? `#${d.id_empresa}`,
      historico: d.historico,
      valor: d.valor,
      usuario: d.usuario,
    }))
  } else {
    const [{ data: debitos }, { data: pessoas }] = await Promise.all([
      supabase
        .from('debitos_pessoa')
        .select('*')
        .order('data', { ascending: false })
        .order('id_debito', { ascending: false })
        .limit(200),
      supabase.from('pessoas_fisicas').select('id_pessoa, nome'),
    ])
    const nomes = new Map(
      ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => [
        p.id_pessoa,
        p.nome,
      ]),
    )
    linhas = ((debitos as DebitoPessoa[] | null) ?? []).map((d) => ({
      id: d.id_debito,
      data: d.data,
      nome: nomes.get(d.id_pessoa) ?? `#${d.id_pessoa}`,
      historico: d.historico,
      valor: d.valor,
      usuario: d.usuario,
    }))
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Débitos"
        descricao="Lançamentos de débito"
        acao={{ href: `/debitos/novo?tipo=${tipo}`, label: '+ Novo débito' }}
      />
      <TabsTipo base="/debitos" tipo={tipo} />

      <Tabela>
        <thead>
          <tr>
            <Th>Data</Th>
            <Th>{tipo === 'empresa' ? 'Empresa' : 'Pessoa'}</Th>
            <Th>Histórico</Th>
            <Th className="text-right">Valor</Th>
            <Th>Usuário</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {linhas.length === 0 && (
            <VazioTabela colunas={6} mensagem="Nenhum débito lançado ainda." />
          )}
          {linhas.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td>{dataBR(l.data)}</Td>
              <Td className="font-medium text-gray-900 dark:text-gray-100">{l.nome}</Td>
              <Td>{l.historico ?? '—'}</Td>
              <Td className="text-right font-semibold text-red-600 dark:text-red-400">
                {brl(l.valor)}
              </Td>
              <Td className="text-gray-400">{l.usuario ?? '—'}</Td>
              <Td className="text-right">
                <ExcluirButton
                  action={excluirDebito.bind(null, tipo, l.id)}
                  confirmText={`Excluir o débito de ${brl(l.valor)} de "${l.nome}"?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
