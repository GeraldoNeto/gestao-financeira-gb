import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormRateio } from './form'
import type { CreditoEmpresa, EmpresaPessoaPercentual } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function NovoRateioPage() {
  const supabase = await createClient()

  const [{ data: empresas }, { data: pessoas }, { data: creditos }, { data: rateios }, { data: pcts }] =
    await Promise.all([
      supabase.from('empresas').select('id_empresa, nome_empresa').eq('status', 'ativo').order('nome_empresa'),
      supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
      supabase
        .from('creditos_empresa')
        .select('id_credito, id_empresa, valor, historico, data_credito')
        .order('data_credito', { ascending: false }),
      supabase.from('rateios').select('id_credito_empresa'),
      supabase.from('empresa_pessoa_percentual').select('id_empresa, id_pessoa, percentual'),
    ])

  const vinculados = new Set(
    ((rateios as { id_credito_empresa: number | null }[] | null) ?? [])
      .map((r) => r.id_credito_empresa)
      .filter((v): v is number => v != null),
  )

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Novo rateio" descricao="Distribuir um crédito da empresa entre pessoas físicas" />
      <FormRateio
        empresas={((empresas as { id_empresa: number; nome_empresa: string }[] | null) ?? []).map(
          (e) => ({ id: e.id_empresa, nome: e.nome_empresa }),
        )}
        pessoas={((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
          id: p.id_pessoa,
          nome: p.nome,
        }))}
        percentuais={(pcts as EmpresaPessoaPercentual[] | null) ?? []}
        creditos={(
          (creditos as (Pick<CreditoEmpresa, 'id_credito' | 'id_empresa' | 'valor' | 'historico'> & {
            data_credito: string
          })[] | null) ?? []
        )
          .filter((c) => !vinculados.has(c.id_credito))
          .map((c) => ({
            id: c.id_credito,
            id_empresa: c.id_empresa,
            valor: c.valor,
            historico: c.historico,
            data: c.data_credito,
          }))}
      />
    </div>
  )
}
