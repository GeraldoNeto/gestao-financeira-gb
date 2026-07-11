'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import type { PagamentoEditState } from '../../actions'

export function FormPagamento({
  idPessoa,
  descricao,
  valor,
  irmaos,
  voltarPara,
  action,
}: {
  idPessoa: number
  descricao: string
  valor: string
  irmaos: { id: number; nome: string }[]
  voltarPara: string
  action: (prev: PagamentoEditState, formData: FormData) => Promise<PagamentoEditState>
}) {
  const [state, formAction, pending] = useActionState<PagamentoEditState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <Campo label="Irmão *">
        <select name="id_pessoa" required defaultValue={idPessoa} className={inputClass}>
          {irmaos.map((i) => (
            <option key={i.id} value={i.id}>
              {i.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Descrição *">
        <input
          name="descricao"
          required
          defaultValue={descricao}
          className={inputClass}
          placeholder="Ex.: boleto do cartão"
        />
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
