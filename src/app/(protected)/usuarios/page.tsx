import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader, Tabela, Th, VazioTabela } from '@/components/ui'
import { LinhaUsuario } from './linha-usuario'
import type { Perfil } from '@/lib/database.types'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: me } = await supabase
    .from('perfis')
    .select('perfil')
    .eq('id', user!.id)
    .single()
  if (me?.perfil !== 'administrador') redirect('/dashboard')

  const { data } = await supabase.from('perfis').select('*').order('nome')
  const todos = (data as Perfil[] | null) ?? []
  // Pendentes (aguardando liberação) primeiro
  const usuarios = [...todos].sort((a, b) => {
    const pa = a.status === 'pendente' ? 0 : 1
    const pb = b.status === 'pendente' ? 0 : 1
    return pa - pb || a.nome.localeCompare(b.nome)
  })
  const pendentes = todos.filter((u) => u.status === 'pendente').length

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Usuários"
        descricao="Gerencie os perfis de acesso (Administrador, Operador, Consulta)"
      />

      {pendentes > 0 && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {pendentes} cadastro(s) aguardando liberação. Para aprovar, mude o <strong>Status</strong>{' '}
          para <strong>Ativo</strong>, escolha o <strong>Perfil</strong> e clique em Salvar.
        </p>
      )}

      <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        <strong>Administrador:</strong> acesso total, incluindo exclusões e gestão de usuários ·{' '}
        <strong>Operador:</strong> cadastra e edita, mas não exclui ·{' '}
        <strong>Consulta:</strong> somente leitura e exportação. Novos cadastros entram como{' '}
        <strong>Pendente</strong> (sem acesso) até você liberar.
      </p>

      <Tabela>
        <thead>
          <tr>
            <Th>Nome</Th>
            <Th>E-mail</Th>
            <Th>Perfil</Th>
            <Th>Status / Ação</Th>
          </tr>
        </thead>
        <tbody>
          {usuarios.length === 0 && <VazioTabela colunas={4} mensagem="Nenhum usuário encontrado." />}
          {usuarios.map((u) => (
            <LinhaUsuario key={u.id} usuario={u} ehVoce={u.id === user!.id} />
          ))}
        </tbody>
      </Tabela>
    </div>
  )
}
