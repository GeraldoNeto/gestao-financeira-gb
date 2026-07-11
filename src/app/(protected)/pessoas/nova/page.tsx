import { PageHeader } from '@/components/ui'
import { FormPessoa } from '../form'
import { criarPessoa } from '../actions'

export default function NovaPessoaPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Novo irmão" descricao="Cadastrar um irmão (co-dono dos imóveis)" voltar="/pessoas" />
      <FormPessoa action={criarPessoa} />
    </div>
  )
}
