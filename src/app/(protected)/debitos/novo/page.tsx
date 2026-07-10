import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormLancamento } from '@/components/form-lancamento'
import { criarDebito, type TipoEntidade } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NovoDebitoPage({
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
        titulo="Novo débito"
        descricao={tipo === 'empresa' ? 'Lançar débito para empresa' : 'Lançar débito para pessoa física'}
      />
      <FormLancamento
        tipo={tipo}
        entidades={entidades}
        action={criarDebito}
        voltarPara={`/debitos?tipo=${tipo}`}
        rotuloValor="Valor do débito"
      />
    </div>
  )
}
