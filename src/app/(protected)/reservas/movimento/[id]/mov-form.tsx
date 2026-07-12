'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { MovEditState } from '../../actions'

export function MovForm({
  tipo,
  descricao,
  valor,
  voltarPara,
  action,
}: {
  tipo: 'CREDITO' | 'DEBITO'
  descricao: string
  valor: string
  voltarPara: string
  action: (prev: MovEditState, formData: FormData) => Promise<MovEditState>
}) {
  const [state, formAction, pending] = useActionState<MovEditState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Tipo *">
        <select name="tipo" defaultValue={tipo} className={inputClass}>
          <option value="DEBITO">Débito (uso da reserva)</option>
          <option value="CREDITO">Crédito (reforço)</option>
        </select>
      </Campo>
      <Campo label="Descrição *">
        <input name="descricao" required defaultValue={descricao} className={inputClass} />
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
