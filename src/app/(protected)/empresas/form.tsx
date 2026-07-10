'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { Empresa } from '@/lib/database.types'
import type { CadState } from './actions'

export function FormEmpresa({
  empresa,
  action,
}: {
  empresa?: Empresa
  action: (prev: CadState, formData: FormData) => Promise<CadState>
}) {
  const [state, formAction, pending] = useActionState<CadState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Nome da empresa *">
        <input
          name="nome_empresa"
          required
          defaultValue={empresa?.nome_empresa}
          className={inputClass}
          placeholder="Razão social ou nome fantasia"
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="CNPJ">
          <input
            name="cnpj"
            defaultValue={empresa?.cnpj ?? ''}
            className={inputClass}
            placeholder="00.000.000/0000-00"
          />
        </Campo>
        <Campo label="Telefone">
          <input
            name="telefone"
            defaultValue={empresa?.telefone ?? ''}
            className={inputClass}
            placeholder="(00) 00000-0000"
          />
        </Campo>
      </div>
      <Campo label="E-mail">
        <input
          name="email"
          type="email"
          defaultValue={empresa?.email ?? ''}
          className={inputClass}
          placeholder="contato@empresa.com"
        />
      </Campo>
      <Campo label="Endereço">
        <input
          name="endereco"
          defaultValue={empresa?.endereco ?? ''}
          className={inputClass}
          placeholder="Rua, número, cidade"
        />
      </Campo>
      <Campo label="Status">
        <select name="status" defaultValue={empresa?.status ?? 'ativo'} className={inputClass}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/empresas" className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
