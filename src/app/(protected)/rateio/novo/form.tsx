'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { Campo, ErroForm, inputClass, btnPrimary, btnSecondary } from '@/components/ui'
import { brl, parseValorBRL, hojeISO } from '@/lib/format'
import { executarRateio, type RateioState } from '../actions'

type Empresa = { id: number; nome: string }
type Pessoa = { id: number; nome: string }
type Percentual = { id_empresa: number; id_pessoa: number; percentual: number }
type Credito = { id: number; id_empresa: number; valor: number; historico: string | null; data: string }

export function FormRateio({
  empresas,
  pessoas,
  percentuais,
  creditos,
}: {
  empresas: Empresa[]
  pessoas: Pessoa[]
  percentuais: Percentual[]
  creditos: Credito[]
}) {
  const [state, formAction, pending] = useActionState<RateioState, FormData>(
    executarRateio,
    undefined,
  )

  const [idEmpresa, setIdEmpresa] = useState('')
  const [idCredito, setIdCredito] = useState('')
  const [valorTexto, setValorTexto] = useState('')
  const [selecionadas, setSelecionadas] = useState<Set<number>>(new Set())

  // Créditos da empresa selecionada, ainda não vinculados a rateio.
  const creditosDaEmpresa = useMemo(
    () => creditos.filter((c) => c.id_empresa === Number(idEmpresa)),
    [creditos, idEmpresa],
  )

  const valorTotal = parseValorBRL(valorTexto)
  const n = selecionadas.size

  // Percentual da pessoa para a empresa selecionada (default 100 sem vínculo).
  const pctMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of percentuais) m.set(`${x.id_empresa}:${x.id_pessoa}`, x.percentual)
    return m
  }, [percentuais])
  const pctDe = (idPessoa: number) =>
    idEmpresa ? pctMap.get(`${Number(idEmpresa)}:${idPessoa}`) ?? 100 : 100

  // Prévia ponderada (espelha fn_executar_rateio: cotas por percentual da empresa,
  // trunc 2 casas por pessoa, resíduo somado ao 1º participante).
  const previa = useMemo(() => {
    if (!valorTotal || valorTotal <= 0 || n === 0) return null
    // mantém a ordem de exibição (= ordem que os checkboxes submetem)
    const sel = pessoas.filter((p) => selecionadas.has(p.id))
    const comPct = sel.map((p) => ({ ...p, percentual: pctDe(p.id) }))
    const pesoTotal = comPct.reduce((s, p) => s + p.percentual / 100, 0)
    if (pesoTotal <= 0) return null
    const valorCota = Math.floor((valorTotal / pesoTotal) * 100) / 100
    const itens = comPct.map((p) => ({
      id: p.id,
      nome: p.nome,
      percentual: p.percentual,
      valor: Math.floor((valorTotal * (p.percentual / 100) / pesoTotal) * 100) / 100,
    }))
    const soma = itens.reduce((s, it) => s + it.valor, 0)
    const residual = Math.round((valorTotal - soma) * 100) / 100
    if (itens.length && residual !== 0)
      itens[0].valor = Math.round((itens[0].valor + residual) * 100) / 100
    const ponderado = comPct.some((p) => p.percentual !== 100)
    return { valorCota, residual, itens, ponderado }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valorTotal, n, pessoas, selecionadas, pctMap, idEmpresa])

  function togglePessoa(id: number) {
    setSelecionadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <input type="hidden" name="id_empresa" value={idEmpresa} />
      <input type="hidden" name="id_credito_empresa" value={idCredito} />

      {/* Coluna principal */}
      <div className="space-y-4 lg:col-span-2">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <Campo label="Empresa *">
            <select
              required
              value={idEmpresa}
              onChange={(e) => {
                setIdEmpresa(e.target.value)
                setIdCredito('')
              }}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione a empresa…
              </option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </Campo>

          {idEmpresa && creditosDaEmpresa.length > 0 && (
            <Campo label="Vincular a um crédito da empresa (opcional)">
              <select
                value={idCredito}
                onChange={(e) => {
                  setIdCredito(e.target.value)
                  const c = creditosDaEmpresa.find((x) => x.id === Number(e.target.value))
                  if (c) setValorTexto(String(c.valor).replace('.', ','))
                }}
                className={inputClass}
              >
                <option value="">Não vincular</option>
                {creditosDaEmpresa.map((c) => (
                  <option key={c.id} value={c.id}>
                    {brl(c.valor)} — {c.historico ?? 'sem histórico'}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Valor total a ratear (R$) *">
              <input
                name="valor_total"
                required
                inputMode="decimal"
                value={valorTexto}
                onChange={(e) => setValorTexto(e.target.value)}
                className={inputClass}
                placeholder="1.000,00"
              />
            </Campo>
            <Campo label="Data *">
              <input name="data" type="date" required defaultValue={hojeISO()} className={inputClass} />
            </Campo>
          </div>

          <Campo label="Histórico">
            <input
              name="historico"
              className={inputClass}
              placeholder="Ex.: Rateio de bonificação"
              defaultValue="Rateio de crédito da empresa"
            />
          </Campo>
        </div>

        {/* Participantes */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Participantes ({n} selecionada{n === 1 ? '' : 's'})
            </h3>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelecionadas(new Set(pessoas.map((p) => p.id)))}
                className="text-emerald-600 hover:underline"
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelecionadas(new Set())}
                className="text-gray-500 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          {pessoas.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nenhuma pessoa física ativa cadastrada.{' '}
              <Link href="/pessoas/nova" className="text-emerald-600 hover:underline">
                Cadastrar
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pessoas.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                >
                  <input
                    type="checkbox"
                    name="pessoas"
                    value={p.id}
                    checked={selecionadas.has(p.id)}
                    onChange={() => togglePessoa(p.id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="flex-1 text-gray-700 dark:text-gray-300">{p.nome}</span>
                  {idEmpresa && pctDe(p.id) !== 100 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {pctDe(p.id)}%
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coluna de prévia */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-400">
            Prévia do rateio
          </h3>

          <LinhaPrevia rotulo="Valor total" valor={valorTotal ? brl(valorTotal) : '—'} />
          <LinhaPrevia rotulo="Participantes" valor={String(n)} />
          <LinhaPrevia
            rotulo="Valor por cota (100%)"
            valor={previa ? brl(previa.valorCota) : '—'}
            destaque
          />
          <LinhaPrevia
            rotulo="Resíduo (arredondamento)"
            valor={previa ? brl(previa.residual) : '—'}
          />

          {previa && previa.ponderado && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Rateio ponderado: quem recebe menos de 100% conta como cota parcial; o valor total é
              distribuído integralmente entre os participantes.
            </p>
          )}

          {previa && (
            <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                Distribuição
              </p>
              <ul className="space-y-1.5">
                {previa.itens.map((it, idx) => (
                  <li key={it.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      {it.nome}
                      {it.percentual !== 100 && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          {it.percentual}%
                        </span>
                      )}
                      {idx === 0 && previa.residual !== 0 && (
                        <span className="text-[10px] text-blue-500">+resíduo</span>
                      )}
                    </span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {brl(it.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ErroForm erro={state?.error} />

          <button
            type="submit"
            disabled={pending || !previa}
            className={`${btnPrimary} w-full`}
          >
            {pending ? 'Processando…' : 'Executar rateio'}
          </button>
          <Link href="/rateio" className={`${btnSecondary} w-full`}>
            Cancelar
          </Link>
        </div>
      </div>
    </form>
  )
}

function LinhaPrevia({
  rotulo,
  valor,
  destaque = false,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{rotulo}</span>
      <span
        className={
          destaque
            ? 'text-lg font-semibold text-emerald-600 dark:text-emerald-400'
            : 'text-sm font-medium text-gray-900 dark:text-gray-100'
        }
      >
        {valor}
      </span>
    </div>
  )
}
