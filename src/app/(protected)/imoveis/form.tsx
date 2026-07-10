'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { Imovel } from '@/lib/database.types'
import type { CadState } from './actions'

export function FormImovel({
  imovel,
  action,
}: {
  imovel?: Imovel
  action: (prev: CadState, formData: FormData) => Promise<CadState>
}) {
  const [state, formAction, pending] = useActionState<CadState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Nome / identificação *">
        <input
          name="nome"
          required
          defaultValue={imovel?.nome}
          className={inputClass}
          placeholder="Ex.: Prédio Centro, Casa da Praia"
        />
      </Campo>
      <Campo label="Endereço">
        <input
          name="endereco"
          defaultValue={imovel?.endereco ?? ''}
          className={inputClass}
          placeholder="Rua, número, bairro, cidade"
        />
      </Campo>
      <Campo label="Observação">
        <textarea
          name="observacao"
          rows={2}
          defaultValue={imovel?.observacao ?? ''}
          className={inputClass}
        />
      </Campo>
      <Campo label="Status">
        <select name="status" defaultValue={imovel?.status ?? 'ativo'} className={inputClass}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/imoveis" className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
