'use client'

import { useActionState } from 'react'
import { inputClass, btnPrimary, ErroForm } from '@/components/ui'
import { salvarPercentuais, type PctState } from './actions'

type PessoaPct = { id: number; nome: string; percentual: number }

export function PercentuaisForm({
  idEmpresa,
  pessoas,
}: {
  idEmpresa: number
  pessoas: PessoaPct[]
}) {
  const action = salvarPercentuais.bind(null, idEmpresa)
  const [state, formAction, pending] = useActionState<PctState, FormData>(action, undefined)

  if (pessoas.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Nenhuma pessoa física ativa cadastrada para configurar.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">
        Defina quanto cada pessoa recebe nos rateios <strong>desta empresa</strong>. Deixe 100% para
        recebimento integral. A mesma pessoa pode ter percentuais diferentes em outras empresas.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pessoas.map((p) => (
          <label
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{p.nome}</span>
            <span className="flex items-center gap-1">
              <input
                name={`pct_${p.id}`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={p.percentual}
                className={`${inputClass} w-24 text-right`}
              />
              <span className="text-sm text-gray-400">%</span>
            </span>
          </label>
        ))}
      </div>

      <ErroForm erro={state?.error} />
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Percentuais salvos.
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? 'Salvando…' : 'Salvar percentuais'}
      </button>
    </form>
  )
}
