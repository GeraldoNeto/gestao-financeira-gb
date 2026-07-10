'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { hojeISO } from '@/lib/format'

type LancState = { error?: string } | undefined

/**
 * Formulário compartilhado de lançamento (crédito ou débito, empresa ou pessoa).
 * A action recebida decide a tabela; `tipo` vai como campo oculto.
 */
export function FormLancamento({
  tipo,
  entidades,
  action,
  voltarPara,
  rotuloValor,
}: {
  tipo: 'empresa' | 'pessoa'
  entidades: { id: number; nome: string }[]
  action: (prev: LancState, formData: FormData) => Promise<LancState>
  voltarPara: string
  rotuloValor: string
}) {
  const [state, formAction, pending] = useActionState<LancState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <input type="hidden" name="tipo" value={tipo} />

      <Campo label={tipo === 'empresa' ? 'Empresa *' : 'Pessoa *'}>
        <select name="id_entidade" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Selecione…
          </option>
          {entidades.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Data *">
          <input name="data" type="date" required defaultValue={hojeISO()} className={inputClass} />
        </Campo>
        <Campo label={`${rotuloValor} (R$) *`}>
          <input
            name="valor"
            required
            inputMode="decimal"
            className={inputClass}
            placeholder="1.234,56"
          />
        </Campo>
      </div>

      <Campo label="Histórico">
        <input
          name="historico"
          className={inputClass}
          placeholder="Descrição do lançamento"
        />
      </Campo>

      {tipo === 'empresa' && (
        <Campo label="Observação">
          <textarea name="observacao" rows={2} className={inputClass} />
        </Campo>
      )}

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Lançando…' : 'Lançar'}
        </button>
        <Link href={voltarPara} className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
