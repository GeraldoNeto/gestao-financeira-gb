import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormContrato } from '../form'
import { criarContrato } from '../actions'

export const dynamic = 'force-dynamic'

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ imovel?: string }>
}) {
  const { imovel } = await searchParams
  const idImovel = Number(imovel)
  const temImovel = Number.isInteger(idImovel) && idImovel > 0

  const supabase = await createClient()
  const { data: imoveis } = await supabase
    .from('imoveis')
    .select('id_imovel, nome')
    .eq('status', 'ativo')
    .order('nome')

  const listaImoveis = ((imoveis as { id_imovel: number; nome: string }[] | null) ?? []).map((i) => ({
    id: i.id_imovel,
    nome: i.nome,
  }))

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Novo aluguel" descricao="Cadastrar o aluguel de um imóvel (valor e vencimento)" voltar={temImovel ? `/imoveis/${idImovel}` : '/contratos'} />
      {listaImoveis.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Cadastre um <Link href="/imoveis/nova" className="underline">imóvel</Link> antes.
        </p>
      ) : (
        <FormContrato
          imoveis={listaImoveis}
          action={criarContrato}
          defaultImovel={temImovel ? idImovel : undefined}
          voltarPara={temImovel ? `/imoveis/${idImovel}` : '/contratos'}
        />
      )}
    </div>
  )
}
