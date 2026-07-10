import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, VazioTabela } from '@/components/ui'
import { TabsTipo } from '@/components/tabs-tipo'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirCredito, type TipoEntidade } from './actions'
import type { CreditoEmpresa, CreditoPessoa } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

type Linha = {
  id: number
  data: string
  nome: string
  historico: string | null
  valor: number
  usuario: string | null
  deRateio: boolean
}

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const { tipo: tipoParam } = await searchParams
  const tipo: TipoEntidade = tipoParam === 'pessoa' ? 'pessoa' : 'empresa'

  const supabase = await createClient()
  let linhas: Linha[] = []

  if (tipo === 'empresa') {
    const [{ data: creditos }, { data: empresas }] = await Promise.all([
      supabase
        .from('creditos_empresa')
        .select('*')
        .order('data_credito', { ascending: false })
        .order('id_credito', { ascending: false })
        .limit(200),
      supabase.from('empresas').select('id_empresa, nome_empresa'),
    ])
    const nomes = new Map(
      ((empresas as { id_empresa: number; nome_empresa: string }[] | null) ?? []).map((e) => [
        e.id_empresa,
        e.nome_empresa,
      ]),
    )
    linhas = ((creditos as CreditoEmpresa[] | null) ?? []).map((c) => ({
      id: c.id_credito,
      data: c.data_credito,
      nome: nomes.get(c.id_empresa) ?? `#${c.id_empresa}`,
      historico: c.historico,
      valor: c.valor,
      usuario: c.usuario,
      deRateio: false,
    }))
  } else {
    const [{ data: creditos }, { data: pessoas }] = await Promise.all([
      supabase
        .from('creditos_pessoa')
        .select('*')
        .order('data', { ascending: false })
        .order('id_credito', { ascending: false })
        .limit(200),
      supabase.from('pessoas_fisicas').select('id_pessoa, nome'),
    ])
    const nomes = new Map(
      ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => [
        p.id_pessoa,
        p.nome,
      ]),
    )
    linhas = ((creditos as CreditoPessoa[] | null) ?? []).map((c) => ({
      id: c.id_credito,
      data: c.data,
      nome: nomes.get(c.id_pessoa) ?? `#${c.id_pessoa}`,
      historico: c.historico,
      valor: c.valor,
      usuario: c.usuario,
      deRateio: c.origem_rateio != null,
    }))
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Créditos"
        descricao="Lançamentos de crédito"
        acao={{ href: `/creditos/novo?tipo=${tipo}`, label: '+ Novo crédito' }}
      />
      <TabsTipo base="/creditos" tipo={tipo} />

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
            <VazioTabela colunas={6} mensagem="Nenhum crédito lançado ainda." />
          )}
          {linhas.map((l) => (
            <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td>{dataBR(l.data)}</Td>
              <Td className="font-medium text-gray-900 dark:text-gray-100">{l.nome}</Td>
              <Td>
                {l.historico ?? '—'}
                {l.deRateio && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium uppercase text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    rateio
                  </span>
                )}
              </Td>
              <Td className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                {brl(l.valor)}
              </Td>
              <Td className="text-gray-400">{l.usuario ?? '—'}</Td>
              <Td className="text-right">
                <ExcluirButton
                  action={excluirCredito.bind(null, tipo, l.id)}
                  confirmText={`Excluir o crédito de ${brl(l.valor)} de "${l.nome}"?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
