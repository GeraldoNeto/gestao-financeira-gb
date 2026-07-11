import { PageHeader } from '@/components/ui'
import { FormImovel } from '../form'
import { criarImovel } from '../actions'

export default function NovoImovelPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader titulo="Novo imóvel" descricao="Cadastrar um imóvel" voltar="/imoveis" />
      <FormImovel action={criarImovel} />
    </div>
  )
}
