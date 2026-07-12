import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui'
import { competenciaBR, mesAtual } from '@/lib/format'
import { ContaForm } from './conta-form'
import { atualizarConta } from '../actions'
import type { ContaIrmaos } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function EditarContaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const idNum = Number(id)
  if (!Number.isInteger(idNum)) notFound()

  const supabase = await createClient()
  const [{ data }, { data: pessoas }] = await Promise.all([
    supabase.from('contas_irmaos').select('*').eq('id_conta', idNum).single(),
    supabase.from('pessoas_fisicas').select('id_pessoa, nome').eq('status', 'ativo').order('nome'),
  ])

  const conta = data as ContaIrmaos | null
  if (!conta) notFound()

  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : (conta.competencia.slice(0, 7) || mesAtual())
  const voltarPara = `/contas?mes=${mes}`
  const irmaos = ((pessoas as { id_pessoa: number; nome: string }[] | null) ?? []).map((p) => ({
    id: p.id_pessoa,
    nome: p.nome,
  }))
  const numBR = (n: number) => Number(n).toFixed(2).replace('.', ',')

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Editar operação"
        descricao={`Conta entre irmãos de ${competenciaBR(conta.competencia)}`}
        voltar={voltarPara}
      />
      <ContaForm
        idOrigem={conta.id_origem}
        idDestino={conta.id_destino}
        descricao={conta.descricao}
        moeda={conta.moeda}
        valorMoeda={numBR(conta.valor_moeda)}
        cotacao={numBR(conta.cotacao)}
        irmaos={irmaos}
        voltarPara={voltarPara}
        action={atualizarConta.bind(null, conta.id_conta, mes)}
      />
    </div>
  )
}
