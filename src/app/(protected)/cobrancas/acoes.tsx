'use client'

import { useState, useTransition } from 'react'
import { darBaixa, estornar } from './actions'

export function AcoesCobranca({ id, pago }: { id: number; pago: boolean }) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function executar(fn: (id: number) => Promise<{ error?: string } | void>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setErro(null)
    startTransition(async () => {
      const r = await fn(id)
      if (r && 'error' in r && r.error) setErro(r.error)
    })
  }

  return (
    <span className="inline-flex items-center gap-2">
      {pago ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => executar(estornar, 'Estornar esta baixa (voltar a pendente)?')}
          className="rounded-lg px-2 py-1 text-xs font-medium text-amber-600 transition hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-950"
        >
          {pending ? '…' : 'Estornar'}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => executar(darBaixa)}
          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? '…' : 'Dar baixa'}
        </button>
      )}
      {erro && <span className="text-xs text-red-500">{erro}</span>}
    </span>
  )
}
