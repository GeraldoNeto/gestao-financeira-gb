'use client'

import { useState } from 'react'
import { inputClass, btnPrimary } from '@/components/ui'
import { criarDespesaAluguel } from '../actions'

export function DespesaAluguelForm({ idContrato }: { idContrato: number }) {
  const [recorrente, setRecorrente] = useState(false)

  return (
    <form
      action={criarDespesaAluguel.bind(null, idContrato)}
      className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição
          </span>
          <input
            name="descricao"
            required
            className={inputClass}
            placeholder="Ex.: IPTU, seguro, condomínio"
          />
        </label>

        {recorrente ? (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                A partir de
              </span>
              <input type="month" name="de" required className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Até (opcional)
              </span>
              <input type="month" name="ate" className={inputClass} />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Data</span>
            <input type="date" name="data" required className={inputClass} />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor (R$)
          </span>
          <input name="valor" required className={`${inputClass} w-36`} placeholder="0,00" />
        </label>
        <button type="submit" className={btnPrimary}>
          + Lançar despesa
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          name="recorrente"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
          className="h-4 w-4"
        />
        Repetir todo mês (despesa recorrente, ex.: condomínio, seguro parcelado)
      </label>
    </form>
  )
}
