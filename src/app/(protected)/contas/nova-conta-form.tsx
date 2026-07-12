'use client'

import { useState } from 'react'
import { inputClass, btnPrimary } from '@/components/ui'
import { brl } from '@/lib/format'
import { criarConta } from './actions'

type Irmao = { id: number; nome: string }

function parseNum(s: string): number {
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function NovaContaForm({ mes, irmaos }: { mes: string; irmaos: Irmao[] }) {
  const [moeda, setMoeda] = useState('BRL')
  const [valorMoeda, setValorMoeda] = useState('')
  const [cotacao, setCotacao] = useState('1')

  const isBRL = moeda.trim().toUpperCase() === 'BRL'
  const vm = parseNum(valorMoeda)
  const ct = isBRL ? 1 : parseNum(cotacao)
  const brlPreview = Number.isFinite(vm) && Number.isFinite(ct) ? vm * ct : NaN

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

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Descrição da operação
        </span>
        <input
          name="descricao"
          required
          className={inputClass}
          placeholder="Ex.: pagamento em CAD pela filha do Edson"
        />
      </label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Moeda</span>
          <input
            name="moeda"
            value={moeda}
            onChange={(e) => setMoeda(e.target.value)}
            className={inputClass}
            placeholder="BRL"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor {isBRL ? '(R$)' : `(${moeda.toUpperCase()})`}
          </span>
          <input
            name="valor_moeda"
            value={valorMoeda}
            onChange={(e) => setValorMoeda(e.target.value)}
            required
            className={inputClass}
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cotação (R$)
          </span>
          <input
            name="cotacao"
            value={isBRL ? '1' : cotacao}
            onChange={(e) => setCotacao(e.target.value)}
            disabled={isBRL}
            className={`${inputClass} disabled:opacity-60`}
            placeholder="1,00"
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor em R$
          </span>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-gray-800 dark:bg-gray-800 dark:text-emerald-400">
            {Number.isFinite(brlPreview) ? brl(brlPreview) : '—'}
          </div>
        </div>
      </div>

      {!isBRL && (
        <p className="text-xs text-gray-500">
          Cotação = quantos reais vale 1 {moeda.toUpperCase()}. Valor em R$ = valor × cotação.
        </p>
      )}

      <button type="submit" className={btnPrimary}>
        + Registrar operação
      </button>
    </form>
  )
}
