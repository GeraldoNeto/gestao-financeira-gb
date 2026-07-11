'use client'

import { useActionState } from 'react'
import { inputClass, btnPrimary, ErroForm } from '@/components/ui'
import { brl } from '@/lib/format'
import { salvarAlugueisIrmao, type PctState } from './actions'

type AluguelPct = { id: number; nome: string; valor: number; percentual: number }

export function AlugueisIrmaoForm({
  idPessoa,
  alugueis,
}: {
  idPessoa: number
  alugueis: AluguelPct[]
}) {
  const action = salvarAlugueisIrmao.bind(null, idPessoa)
  const [state, formAction, pending] = useActionState<PctState, FormData>(action, undefined)

  if (alugueis.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum aluguel cadastrado ainda.</p>
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">
        Informe o peso deste irmão em cada aluguel (ex.: <strong>100%</strong> ou{' '}
        <strong>50%</strong>). Deixe <strong>0</strong> nos aluguéis em que ele não recebe. A
        divisão é feita proporcionalmente entre os irmãos de cada aluguel.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {alugueis.map((a) => (
          <label
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {a.nome}
              </span>
              <span className="block text-xs text-gray-400">{brl(a.valor)}/mês</span>
            </span>
            <span className="flex items-center gap-1">
              <input
                name={`pct_${a.id}`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={a.percentual}
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
          Aluguéis salvos.
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? 'Salvando…' : 'Salvar aluguéis'}
      </button>
    </form>
  )
}
