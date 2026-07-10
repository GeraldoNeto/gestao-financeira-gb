import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormLancamento } from '@/components/form-lancamento'
import { criarCredito, type TipoEntidade } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NovoCreditoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const { tipo: tipoParam } = await searchParams
  const tipo: TipoEntidade = tipoParam === 'pessoa' ? 'pessoa' : 'empresa'

  const supabase = await createClient()
  const entidades =
    tipo === 'empresa'
      ? (
          (
            await supabase
              .from('empresas')
              .select('id_empresa, nome_empresa')
              .eq('status', 'ativo')
              .order('nome_empresa')
          ).data as { id_empresa: number; nome_empresa: string }[] | null
        )?.map((e) => ({ id: e.id_empresa, nome: e.nome_empresa })) ?? []
      : (
          (
            await supabase
              .from('pessoas_fisicas')
              .select('id_pessoa, nome')
              .eq('status', 'ativo')
              .order('nome')
          ).data as { id_pessoa: number; nome: string }[] | null
        )?.map((p) => ({ id: p.id_pessoa, nome: p.nome })) ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Novo crédito"
        descricao={tipo === 'empresa' ? 'Lançar crédito para empresa' : 'Lançar crédito para pessoa física'}
      />
      <FormLancamento
        tipo={tipo}
        entidades={entidades}
        action={criarCredito}
        voltarPara={`/creditos?tipo=${tipo}`}
        rotuloValor="Valor do crédito"
      />
    </div>
  )
}
