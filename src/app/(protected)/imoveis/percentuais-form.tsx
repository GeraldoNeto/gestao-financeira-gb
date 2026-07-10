'use client'

import { useActionState, useMemo, useState } from 'react'
import { inputClass, btnPrimary, ErroForm } from '@/components/ui'
import { salvarPercentuaisImovel, type PctState } from './actions'

type IrmaoPct = { id: number; nome: string; percentual: number }

export function PercentuaisImovelForm({
  idImovel,
  irmaos,
}: {
  idImovel: number
  irmaos: IrmaoPct[]
}) {
  const action = salvarPercentuaisImovel.bind(null, idImovel)
  const [state, formAction, pending] = useActionState<PctState, FormData>(action, undefined)

  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(irmaos.map((i) => [i.id, String(i.percentual)])),
  )

  const total = useMemo(
    () =>
      Object.values(valores).reduce((s, v) => {
        const n = Number(String(v).replace(',', '.'))
        return s + (Number.isFinite(n) ? n : 0)
      }, 0),
    [valores],
  )
  const totalOk = Math.abs(total - 100) < 0.005

  if (irmaos.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Nenhum irmão (pessoa física) ativo cadastrado para configurar.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-500">
        Defina o percentual de cada irmão sobre o aluguel recebido <strong>deste imóvel</strong>.
        Idealmente somam <strong>100%</strong> (se não somarem, a divisão é feita proporcionalmente).
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {irmaos.map((i) => (
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
                value={valores[i.id] ?? '0'}
                onChange={(e) => setValores((v) => ({ ...v, [i.id]: e.target.value }))}
                className={`${inputClass} w-24 text-right`}
              />
              <span className="text-sm text-gray-400">%</span>
            </span>
          </label>
        ))}
      </div>

      <p className={`text-sm font-medium ${totalOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
        Soma: {total.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%
        {totalOk ? ' ✓' : ' (o ideal é 100%)'}
      </p>

      <ErroForm erro={state?.error} />
      {state?.ok && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Divisão salva.
        </p>
      )}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? 'Salvando…' : 'Salvar divisão'}
      </button>
    </form>
  )
}
