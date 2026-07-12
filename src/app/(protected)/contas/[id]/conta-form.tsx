'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { brl } from '@/lib/format'
import type { ContaEditState } from '../actions'

type Irmao = { id: number; nome: string }

function parseNum(s: string): number {
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export function ContaForm({
  idOrigem,
  idDestino,
  descricao,
  moeda: moedaIni,
  valorMoeda: valorIni,
  cotacao: cotacaoIni,
  irmaos,
  voltarPara,
  action,
}: {
  idOrigem: number
  idDestino: number
  descricao: string
  moeda: string
  valorMoeda: string
  cotacao: string
  irmaos: Irmao[]
  voltarPara: string
  action: (prev: ContaEditState, formData: FormData) => Promise<ContaEditState>
}) {
  const [state, formAction, pending] = useActionState<ContaEditState, FormData>(action, undefined)
  const [moeda, setMoeda] = useState(moedaIni)
  const [valorMoeda, setValorMoeda] = useState(valorIni)
  const [cotacao, setCotacao] = useState(cotacaoIni)

  const isBRL = moeda.trim().toUpperCase() === 'BRL'
  const vm = parseNum(valorMoeda)
  const ct = isBRL ? 1 : parseNum(cotacao)
  const brlPreview = Number.isFinite(vm) && Number.isFinite(ct) ? vm * ct : NaN

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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo label="Moeda">
          <input
            name="moeda"
            value={moeda}
            onChange={(e) => setMoeda(e.target.value)}
            className={inputClass}
          />
        </Campo>
        <Campo label={`Valor ${isBRL ? '(R$)' : `(${moeda.toUpperCase()})`}`}>
          <input
            name="valor_moeda"
            value={valorMoeda}
            onChange={(e) => setValorMoeda(e.target.value)}
            required
            className={inputClass}
          />
        </Campo>
        <Campo label="Cotação (R$)">
          <input
            name="cotacao"
            value={isBRL ? '1' : cotacao}
            onChange={(e) => setCotacao(e.target.value)}
            disabled={isBRL}
            className={`${inputClass} disabled:opacity-60`}
          />
        </Campo>
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor em R$
          </span>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:border-gray-800 dark:bg-gray-800 dark:text-emerald-400">
            {Number.isFinite(brlPreview) ? brl(brlPreview) : '—'}
          </div>
        </div>
      </div>

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
