import { PageHeader } from '@/components/ui'
import { FormPessoa } from '../form'
import { criarPessoa } from '../actions'

export default function NovaPessoaPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Nova pessoa" descricao="Cadastrar uma nova pessoa física" />
      <FormPessoa action={criarPessoa} />
    </div>
  )
}
