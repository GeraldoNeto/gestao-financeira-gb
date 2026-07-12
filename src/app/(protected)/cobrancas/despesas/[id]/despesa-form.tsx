'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { DespesaEditState } from '../../actions'

export function FormDespesa({
  descricao,
  valor,
  data,
  idContrato,
  alugueis,
  voltar,
  voltarPara,
  action,
}: {
  descricao: string
  valor: string
  data: string
  idContrato: number | null
  alugueis: { id: number; label: string }[]
  voltar?: string
  voltarPara: string
  action: (prev: DespesaEditState, formData: FormData) => Promise<DespesaEditState>
}) {
  const [state, formAction, pending] = useActionState<DespesaEditState, FormData>(
    action,
    undefined,
  )

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      {voltar && <input type="hidden" name="voltar" value={voltar} />}
      <Campo label="Descrição *">
        <input
          name="descricao"
          required
          defaultValue={descricao}
          className={inputClass}
          placeholder="Ex.: conserto do telhado, IPTU"
        />
      </Campo>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Data">
          <input type="date" name="data" defaultValue={data} className={inputClass} />
        </Campo>
        <Campo label="Valor (R$) *">
          <input name="valor" required defaultValue={valor} className={inputClass} placeholder="0,00" />
        </Campo>
      </div>
      <Campo label="Descontar de">
        <select name="id_contrato" defaultValue={idContrato ?? ''} className={inputClass}>
          <option value="">Todos os aluguéis (geral)</option>
          {alugueis.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
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
