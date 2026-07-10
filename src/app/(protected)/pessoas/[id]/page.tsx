import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { FormPessoa } from '../form'
import { atualizarPessoa } from '../actions'
import type { PessoaFisica } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const { data } = await supabase
    .from('pessoas_fisicas')
    .select('*')
    .eq('id_pessoa', idNum)
    .single()

  const pessoa = data as PessoaFisica | null
  if (!pessoa) notFound()

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Editar pessoa" descricao={pessoa.nome} />
      <FormPessoa pessoa={pessoa} action={atualizarPessoa.bind(null, pessoa.id_pessoa)} />
    </div>
  )
}
