'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { ContaEditState } from '../actions'

type Irmao = { id: number; nome: string }

export function ContaForm({
  idOrigem,
  idDestino,
  descricao,
  valor,
  irmaos,
  voltarPara,
  action,
}: {
  idOrigem: number
  idDestino: number
  descricao: string
  valor: string
  irmaos: Irmao[]
  voltarPara: string
  action: (prev: ContaEditState, formData: FormData) => Promise<ContaEditState>
}) {
  const [state, formAction, pending] = useActionState<ContaEditState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="De — quem pagou/adiantou">
          <select name="id_origem" required defaultValue={idOrigem} className={inputClass}>
            {irmaos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Para — a favor de quem">
          <select name="id_destino" required defaultValue={idDestino} className={inputClass}>
            {irmaos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo label="Descrição *">
        <input name="descricao" required defaultValue={descricao} className={inputClass} />
      </Campo>

      <Campo label="Valor (R$) *">
        <input name="valor" required defaultValue={valor} className={inputClass} placeholder="0,00" />
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href={voltarPara} className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
