'use client'

import { useActionState } from 'react'
import { login, type AuthState } from './actions'
import { ThemeToggle } from '@/components/theme-toggle'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, undefined)

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-bold text-white">
            GB
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Gestão Financeira GB
          </h1>
          <p className="mt-1 text-sm text-gray-500">Entre na sua conta</p>
        </div>

        <form action={formAction} className="space-y-4">
          <Campo label="E-mail">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              placeholder="voce@email.com"
            />
          </Campo>
          <Campo label="Senha">
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </Campo>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? 'Aguarde…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          O acesso é criado pelo administrador. Fale com o responsável para obter seu login.
        </p>
      </div>
    </main>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  )
}
