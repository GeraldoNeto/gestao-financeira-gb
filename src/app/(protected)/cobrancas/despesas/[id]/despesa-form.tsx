'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { DespesaEditState } from '../../actions'

export function FormDespesa({
  descricao,
  valor,
  voltarPara,
  action,
}: {
  descricao: string
  valor: string
  voltarPara: string
  action: (prev: DespesaEditState, formData: FormData) => Promise<DespesaEditState>
}) {
  const [state, formAction, pending] = useActionState<DespesaEditState, FormData>(
    action,
    undefined,
  )

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Descrição *">
        <input
          name="descricao"
          required
          defaultValue={descricao}
          className={inputClass}
          placeholder="Ex.: conserto do telhado, IPTU"
        />
      </Campo>
      <Campo label="Valor (R$) *">
        <input name="valor" required defaultValue={valor} className={inputClass} placeholder="0,00" />
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href={voltarPara} className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
