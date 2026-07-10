import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar, type NavItem } from '@/components/sidebar'

// Itens do menu. `adminOnly` só aparece para o perfil administrador.
const NAV: (NavItem & { adminOnly?: boolean })[] = [
  { href: '/dashboard', label: 'Dashboard', dica: 'Visão geral com indicadores financeiros em tempo real' },
  { href: '/imoveis', label: 'Imóveis', dica: 'Cadastro dos imóveis alugados' },
  { href: '/contratos', label: 'Contratos', dica: 'Contratos de aluguel (imóvel × locatário)' },
  { href: '/cobrancas', label: 'Aluguéis', dica: 'Cobranças mensais: valores recebidos e pendentes por mês' },
  { href: '/pessoas', label: 'Locatários', dica: 'Cadastro de pessoas físicas (locatários) e seus saldos' },
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
    .select('nome, perfil')
    .eq('id', user.id)
    .single()

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
