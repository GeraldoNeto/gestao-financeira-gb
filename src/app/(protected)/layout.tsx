import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem, type NavSecao } from '@/components/sidebar'
import { signout } from '@/app/login/actions'

type Item = NavItem & { adminOnly?: boolean }

// Menu em grupos, na ordem natural de uso:
// Cadastros (feitos uma vez) → Todo mês (operação) → Financeiro → Administração.
const NAV: { titulo?: string; items: Item[] }[] = [
  {
    items: [{ href: '/dashboard', label: 'Início', dica: 'Guia do fluxo e resumo do mês' }],
  },
  {
    titulo: 'Cadastros',
    items: [
      { href: '/imoveis', label: '1. Imóveis', dica: 'Cadastre os imóveis da família' },
      { href: '/contratos', label: '2. Aluguéis', dica: 'Cadastre cada aluguel, o valor mensal e as despesas' },
      { href: '/pessoas', label: '3. Irmãos', dica: 'Cadastre os irmãos e o peso de cada um nos aluguéis' },
    ],
  },
  {
    titulo: 'Todo mês',
    items: [
      { href: '/cobrancas', label: '4. Receber aluguéis', dica: 'Gere as cobranças do mês, dê baixa nas pagas e lance os gastos' },
      { href: '/contas', label: '5. Contas entre irmãos', dica: 'Compensações entre os irmãos (crédito/débito)' },
      { href: '/divisao', label: '6. Divisão', dica: 'Veja quanto transferir para cada irmão' },
      { href: '/relatorios', label: '7. Relatórios', dica: 'Prestação de contas em Excel, PDF ou CSV' },
    ],
  },
  {
    titulo: 'Financeiro',
    items: [
      { href: '/empresas', label: 'Empresas', dica: 'Cadastro de empresas' },
      { href: '/reservas', label: 'Reservas', dica: 'Reservas de valores por empresa (fundos)' },
    ],
  },
  {
    titulo: 'Administração',
    items: [
      { href: '/usuarios', label: 'Usuários', dica: 'Gerenciar acessos ao sistema', adminOnly: true },
    ],
  },
]

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome, perfil, status')
    .eq('id', user.id)
    .single()

  // Conta ainda não liberada (pendente/inativa) — sem acesso ao sistema.
  if (perfil && perfil.status !== 'ativo') {
    return <ContaEmAnalise nome={perfil.nome ?? user.email ?? ''} pendente={perfil.status === 'pendente'} />
  }

  const isAdmin = perfil?.perfil === 'administrador'
  const secoes: NavSecao[] = NAV.map((s) => ({
    titulo: s.titulo,
    items: s.items
      .filter((i) => !i.adminOnly || isAdmin)
      .map(({ href, label, dica }) => ({ href, label, dica })),
  })).filter((s) => s.items.length > 0)

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar secoes={secoes} nome={perfil?.nome ?? user.email ?? 'Usuário'} perfil={perfil?.perfil ?? 'consulta'} />
      <main className="flex-1 overflow-auto p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">{children}</main>
    </div>
  )
}

function ContaEmAnalise({ nome, pendente }: { nome: string; pendente: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-2xl">
          ⏳
        </div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {pendente ? 'Conta em análise' : 'Acesso desativado'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {nome && <span className="font-medium">{nome}, </span>}
          {pendente
            ? 'seu cadastro foi recebido e está aguardando a liberação do administrador. Você receberá acesso assim que ele aprovar.'
            : 'seu acesso está desativado no momento. Fale com o administrador do sistema.'}
        </p>
        <form action={signout} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  )
}
