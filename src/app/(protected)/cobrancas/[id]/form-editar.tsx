'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { atualizarCobranca, type CobrancaEditState } from '../actions'
import type { CobrancaView } from '@/lib/database.types'

export function FormEditarCobranca({ cobranca, mes }: { cobranca: CobrancaView; mes: string }) {
  const action = atualizarCobranca.bind(null, cobranca.id_cobranca, mes)
  const [state, formAction, pending] = useActionState<CobrancaEditState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <p className="text-sm text-gray-500">
        {cobranca.nome_imovel}
        {cobranca.unidade ? ` · ${cobranca.unidade}` : ''}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Valor (R$) *">
          <input
            name="valor"
            required
            inputMode="decimal"
            defaultValue={String(cobranca.valor).replace('.', ',')}
            className={inputClass}
          />
        </Campo>
        <Campo label="Vencimento *">
          <input
            name="vencimento"
            type="date"
            required
            defaultValue={cobranca.vencimento}
            className={inputClass}
          />
        </Campo>
      </div>

      <Campo label="Observação">
        <textarea
          name="observacao"
          rows={2}
          defaultValue={cobranca.observacao ?? ''}
          className={inputClass}
        />
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href={`/cobrancas?mes=${mes}`} className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
