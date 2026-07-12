'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { criarReserva, type ReservaState } from '../actions'

export function ReservaForm({ empresas }: { empresas: { id: number; nome: string }[] }) {
  const [state, formAction, pending] = useActionState<ReservaState, FormData>(criarReserva, undefined)

  if (empresas.length === 0) {
    return (
      <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        Cadastre uma{' '}
        <Link href="/empresas/nova" className="font-medium underline">
          empresa
        </Link>{' '}
        antes de criar uma reserva.
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Empresa *">
        <select name="id_empresa" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Selecione…
          </option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Descrição (finalidade) *">
        <input
          name="descricao"
          required
          className={inputClass}
          placeholder="Ex.: Reserva para pagamento de energia"
        />
      </Campo>
      <Campo label="Valor da reserva (R$) *">
        <input name="valor" required className={inputClass} placeholder="0,00" />
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Criando…' : 'Criar reserva'}
        </button>
        <Link href="/reservas" className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
