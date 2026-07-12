'use client'

import { useActionState, useState } from 'react'
import { inputClass, btnPrimary, ErroForm } from '@/components/ui'
import { registrarMovimento, type MovState } from '../actions'

export function MovimentoForm({ idReserva }: { idReserva: number }) {
  const action = registrarMovimento.bind(null, idReserva)
  const [state, formAction, pending] = useActionState<MovState, FormData>(action, undefined)
  const [tipo, setTipo] = useState<'DEBITO' | 'CREDITO'>('DEBITO')

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</span>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'DEBITO' | 'CREDITO')}
            className={inputClass}
          >
            <option value="DEBITO">Débito (uso da reserva)</option>
            <option value="CREDITO">Crédito (reforço)</option>
          </select>
        </label>
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </span>
          <input
            name="descricao"
            required
            className={inputClass}
            placeholder="Ex.: Pagamento da conta de energia"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor (R$)
          </span>
          <input name="valor" required className={`${inputClass} w-36`} placeholder="0,00" />
        </label>
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Registrando…' : 'Registrar'}
        </button>
      </div>

      {tipo === 'DEBITO' && (
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" name="permitir_negativo" className="h-4 w-4" />
          Autorizar saldo negativo (débito acima do saldo disponível)
        </label>
      )}

      <ErroForm erro={state?.error} />
    </form>
  )
}
