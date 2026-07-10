import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { brl, dataBR } from '@/lib/format'
import { PageHeader, Tabela, Th, Td, BadgeStatus, VazioTabela } from '@/components/ui'
import { ExcluirButton } from '@/components/excluir-button'
import { excluirContrato } from './actions'
import type { ContratoView } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ imovel?: string }>
}) {
  const sp = await searchParams
  const idImovel = Number(sp.imovel)

  const supabase = await createClient()
  let q = supabase.from('vw_contratos').select('*').order('nome_imovel').order('unidade')
  if (Number.isInteger(idImovel) && idImovel > 0) q = q.eq('id_imovel', idImovel)
  const { data } = await q
  const contratos = (data as ContratoView[] | null) ?? []

  const nomeImovel = contratos[0]?.nome_imovel

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Contratos"
        descricao={
          Number.isInteger(idImovel) && nomeImovel
            ? `Contratos do imóvel: ${nomeImovel}`
            : 'Contratos de aluguel (imóvel × locatário)'
        }
        acao={{ href: '/contratos/nova', label: '+ Novo contrato' }}
      />

      <Tabela>
        <thead>
          <tr>
            <Th>Imóvel</Th>
            <Th>Unidade</Th>
            <Th>Locatário</Th>
            <Th className="text-right">Valor mensal</Th>
            <Th className="text-right">Venc.</Th>
            <Th>Período</Th>
            <Th>Status</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {contratos.length === 0 && (
            <VazioTabela colunas={8} mensagem="Nenhum contrato cadastrado ainda." />
          )}
          {contratos.map((c) => (
            <tr key={c.id_contrato} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
              <Td className="font-medium text-gray-900 dark:text-gray-100">{c.nome_imovel}</Td>
              <Td>{c.unidade ?? '—'}</Td>
              <Td>{c.nome_locatario}</Td>
              <Td className="text-right font-semibold">{brl(c.valor_mensal)}</Td>
              <Td className="text-right">dia {c.dia_vencimento}</Td>
              <Td className="text-gray-500">
                {dataBR(c.data_inicio)}
                {c.data_fim ? ` – ${dataBR(c.data_fim)}` : ' – vigente'}
              </Td>
              <Td>
                <BadgeStatus status={c.status} />
              </Td>
              <Td className="text-right">
                <Link
                  href={`/contratos/${c.id_contrato}`}
                  className="mr-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Editar
                </Link>
                <ExcluirButton
                  action={excluirContrato.bind(null, c.id_contrato)}
                  confirmText={`Excluir o contrato de ${c.nome_locatario} (${c.nome_imovel})?`}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
