'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { hojeISO } from '@/lib/format'
import type { Contrato } from '@/lib/database.types'
import type { ContratoState } from './actions'

type Opcao = { id: number; nome: string }

export function FormContrato({
  contrato,
  imoveis,
  action,
}: {
  contrato?: Contrato
  imoveis: Opcao[]
  action: (prev: ContratoState, formData: FormData) => Promise<ContratoState>
}) {
  const [state, formAction, pending] = useActionState<ContratoState, FormData>(action, undefined)

  return (
    <form
      action={formAction}
      className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Imóvel *">
          <select name="id_imovel" required defaultValue={contrato?.id_imovel ?? ''} className={inputClass}>
            <option value="" disabled>
              Selecione…
            </option>
            {imoveis.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Unidade">
          <input
            name="unidade"
            defaultValue={contrato?.unidade ?? ''}
            className={inputClass}
            placeholder="Ex.: Apto 12, Loja 1"
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Valor mensal (R$) *">
          <input
            name="valor_mensal"
            required
            inputMode="decimal"
            defaultValue={contrato ? String(contrato.valor_mensal).replace('.', ',') : ''}
            className={inputClass}
            placeholder="1.500,00"
          />
        </Campo>
        <Campo label="Dia de vencimento *">
          <input
            name="dia_vencimento"
            type="number"
            min={1}
            max={31}
            required
            defaultValue={contrato?.dia_vencimento ?? 10}
            className={inputClass}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Início do contrato *">
          <input
            name="data_inicio"
            type="date"
            required
            defaultValue={contrato?.data_inicio ?? hojeISO()}
            className={inputClass}
          />
        </Campo>
        <Campo label="Fim do contrato (opcional)">
          <input
            name="data_fim"
            type="date"
            defaultValue={contrato?.data_fim ?? ''}
            className={inputClass}
          />
        </Campo>
      </div>

      <Campo label="Status">
        <select name="status" defaultValue={contrato?.status ?? 'ativo'} className={inputClass}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Encerrado / inativo</option>
        </select>
      </Campo>

      <Campo label="Observação">
        <textarea name="observacao" rows={2} defaultValue={contrato?.observacao ?? ''} className={inputClass} />
      </Campo>

      <ErroForm erro={state?.error} />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Salvando…' : 'Salvar'}
        </button>
        <Link href="/contratos" className={btnSecondary}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
