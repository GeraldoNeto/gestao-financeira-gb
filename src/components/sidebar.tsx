'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signout } from '@/app/login/actions'
import { Tooltip } from '@/components/ui'
import { ThemeToggle } from '@/components/theme-toggle'

export type NavItem = { href: string; label: string; dica: string }
export type NavSecao = { titulo?: string; items: NavItem[] }

export function Sidebar({
  secoes,
  nome,
  perfil,
}: {
  secoes: NavSecao[]
  nome: string
  perfil: string
}) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()
  const ativo = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const linkCls = (href: string) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
      ativo(href)
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
        : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-emerald-950 dark:hover:text-emerald-300'
    }`

  const brand = (
    <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
        GB
      </span>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Gestão Financeira GB
      </span>
    </div>
  )

  const rodape = (
    <div className="border-t border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-1">
        <ThemeToggle />
      </div>
      <div className="mb-2 px-2">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{nome}</p>
        <p className="text-xs capitalize text-gray-500">{perfil}</p>
      </div>
      <form action={signout}>
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          Sair
        </button>
      </form>
    </div>
  )

  return (
    <>
      {/* Barra superior (mobile) */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-xs font-bold text-white">
          GB
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Gestão Financeira GB
        </span>
        <div className="ml-auto">
          <ThemeToggle compact />
        </div>
      </header>

      {/* Sidebar desktop */}
      <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white lg:flex dark:border-gray-800 dark:bg-gray-900">
        {brand}
        <nav className="flex-1 space-y-4 p-3">
          {secoes.map((secao, i) => (
            <div key={secao.titulo ?? i} className="space-y-1">
              {secao.titulo && (
                <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {secao.titulo}
                </p>
              )}
              {secao.items.map((item) => (
                <Tooltip key={item.href} texto={item.dica} lado="direita" className="block">
                  <Link href={item.href} className={linkCls(item.href)}>
                    {item.label}
                  </Link>
                </Tooltip>
              ))}
            </div>
          ))}
        </nav>
        {rodape}
      </aside>

      {/* Drawer mobile */}
      {aberto && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl dark:bg-gray-900">
            {brand}
            <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3">
              {secoes.map((secao, i) => (
                <div key={secao.titulo ?? i} className="space-y-1">
                  {secao.titulo && (
                    <p className="px-3 pt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {secao.titulo}
                    </p>
                  )}
                  {secao.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.dica}
                      onClick={() => setAberto(false)}
                      className={linkCls(item.href)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            {rodape}
          </aside>
        </div>
      )}
    </>
  )
}
