'use client'

import { inputClass, btnPrimary } from '@/components/ui'
import { criarConta } from './actions'

type Irmao = { id: number; nome: string }

export function NovaContaForm({ mes, irmaos }: { mes: string; irmaos: Irmao[] }) {
  return (
    <form
      action={criarConta.bind(null, mes)}
      className="mb-4 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            De — quem pagou/adiantou (fica a receber)
          </span>
          <select name="id_origem" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione…
            </option>
            {irmaos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Para — a favor de quem (fica devendo)
          </span>
          <select name="id_destino" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione…
            </option>
            {irmaos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Descrição da operação
          </span>
          <input name="descricao" required className={inputClass} placeholder="Descrição da operação" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor (R$)
          </span>
          <input name="valor" required className={inputClass} placeholder="0,00" />
        </label>
      </div>

      <button type="submit" className={btnPrimary}>
        + Registrar operação
      </button>
    </form>
  )
}
