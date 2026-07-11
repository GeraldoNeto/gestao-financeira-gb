'use client'

import { useActionState } from 'react'
import { inputClass, btnPrimary, ErroForm } from '@/components/ui'
import { salvarAlugueisIrmao, type PctState } from './actions'

type ImovelPct = { id: number; nome: string; percentual: number }

export function AlugueisIrmaoForm({
  idPessoa,
  imoveis,
}: {
  idPessoa: number
  imoveis: ImovelPct[]
}) {
  const action = salvarAlugueisIrmao.bind(null, idPessoa)
  const [state, formAction, pending] = useActionState<PctState, FormData>(action, undefined)

  if (imoveis.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum imóvel cadastrado ainda.</p>
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">
        Informe o peso deste irmão em cada imóvel (ex.: <strong>100%</strong> ou{' '}
        <strong>50%</strong>). Deixe <strong>0</strong> nos imóveis em que ele não recebe. A
        divisão é feita proporcionalmente entre os irmãos de cada imóvel.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {imoveis.map((i) => (
          <label
            key={i.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{i.nome}</span>
            <span className="flex items-center gap-1">
              <input
                name={`pct_${i.id}`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                defaultValue={i.percentual}
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
