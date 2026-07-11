import { PageHeader } from '@/components/ui'
import { FormEmpresa } from '../form'
import { criarEmpresa } from '../actions'

export default function NovaEmpresaPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader titulo="Nova empresa" descricao="Cadastrar uma nova empresa" voltar="/empresas" />
      <FormEmpresa action={criarEmpresa} />
    </div>
  )
}
