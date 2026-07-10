import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem } from '@/components/sidebar'
import { signout } from '@/app/login/actions'

// Itens do menu. `adminOnly` só aparece para o perfil administrador.
const NAV: (NavItem & { adminOnly?: boolean })[] = [
  { href: '/dashboard', label: 'Dashboard', dica: 'Visão geral com indicadores financeiros em tempo real' },
  { href: '/imoveis', label: 'Imóveis', dica: 'Cadastro dos imóveis alugados' },
  { href: '/contratos', label: 'Contratos', dica: 'Contratos de aluguel por imóvel (valor e vencimento)' },
  { href: '/cobrancas', label: 'Aluguéis', dica: 'Cobranças mensais: valores recebidos e pendentes por mês' },
  { href: '/divisao', label: 'Divisão', dica: 'Divisão do aluguel recebido entre os irmãos, por mês' },
  { href: '/pessoas', label: 'Irmãos', dica: 'Cadastro dos irmãos (co-donos) e seus saldos' },
  { href: '/empresas', label: 'Empresas', dica: 'Cadastro de empresas, saldos e percentuais de rateio por pessoa' },
  { href: '/creditos', label: 'Créditos', dica: 'Lançamentos de crédito para empresas e pessoas' },
  { href: '/debitos', label: 'Débitos', dica: 'Lançamentos de débito para empresas e pessoas' },
  { href: '/rateio', label: 'Rateio', dica: 'Distribuição automática de um crédito da empresa entre pessoas físicas' },
  { href: '/relatorios', label: 'Relatórios', dica: 'Consulta e exportação (CSV, Excel, PDF) dos dados financeiros' },
  { href: '/usuarios', label: 'Usuários', dica: 'Gerenciar usuários e perfis de acesso', adminOnly: true },
  { href: '/auditoria', label: 'Auditoria', dica: 'Histórico de todas as operações no sistema', adminOnly: true },
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
  const items: NavItem[] = NAV.filter((i) => !i.adminOnly || isAdmin).map(({ href, label, dica }) => ({
    href,
    label,
    dica,
  }))

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar items={items} nome={perfil?.nome ?? user.email ?? 'Usuário'} perfil={perfil?.perfil ?? 'consulta'} />
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
