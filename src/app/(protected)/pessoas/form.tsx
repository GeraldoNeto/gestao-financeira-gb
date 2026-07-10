'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { PessoaFisica } from '@/lib/database.types'
import type { CadState } from './actions'

export function FormPessoa({
  pessoa,
  action,
}: {
  pessoa?: PessoaFisica
  action: (prev: CadState, formData: FormData) => Promise<CadState>
}) {
  const [state, formAction, pending] = useActionState<CadState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Nome *">
        <input
          name="nome"
          required
          defaultValue={pessoa?.nome}
          className={inputClass}
          placeholder="Nome completo"
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="CPF">
          <input
            name="cpf"
            defaultValue={pessoa?.cpf ?? ''}
            className={inputClass}
            placeholder="000.000.000-00"
          />
        </Campo>
        <Campo label="Telefone">
          <input
            name="telefone"
            defaultValue={pessoa?.telefone ?? ''}
            className={inputClass}
            placeholder="(00) 00000-0000"
          />
        </Campo>
      </div>
      <Campo label="E-mail">
        <input
          name="email"
          type="email"
          defaultValue={pessoa?.email ?? ''}
          className={inputClass}
          placeholder="pessoa@email.com"
        />
      </Campo>
      <Campo label="Status">
        <select name="status" defaultValue={pessoa?.status ?? 'ativo'} className={inputClass}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </Campo>

      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        O percentual de recebimento nos rateios é configurado por empresa, na página de cada
        empresa (a mesma pessoa pode receber 50% de uma e 100% de outra).
      </p>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/pessoas" className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
