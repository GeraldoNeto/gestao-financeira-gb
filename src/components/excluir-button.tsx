'use client'

import { useState, useTransition } from 'react'

/**
 * Botão de exclusão com confirmação. Recebe uma server action já vinculada
 * ao id do registro (via .bind no server component).
 */
export function ExcluirButton({
  action,
  confirmText = 'Tem certeza que deseja excluir este registro?',
}: {
  action: () => Promise<{ error?: string } | void>
  confirmText?: string
}) {
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(confirmText)) return
          setErro(null)
          startTransition(async () => {
            const r = await action()
            if (r && 'error' in r && r.error) setErro(r.error)
          })
        }}
        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? 'Excluindo…' : 'Excluir'}
      </button>
      {erro && <span className="text-xs text-red-500">{erro}</span>}
    </span>
  )
}
