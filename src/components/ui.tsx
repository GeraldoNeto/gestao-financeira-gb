import Link from 'next/link'
import type { StatusRegistro } from '@/lib/database.types'

export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60'

export const btnSecondary =
  'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'

type LadoTooltip = 'baixo' | 'direita'

const posicaoBalao: Record<LadoTooltip, string> = {
  baixo: 'left-1/2 top-full mt-2 -translate-x-1/2',
  direita: 'left-full top-1/2 ml-2 -translate-y-1/2',
}

/** Balão de tooltip (usado dentro de um elemento com `group/tip relative`). */
export function TooltipBubble({
  texto,
  lado = 'baixo',
}: {
  texto: string
  lado?: LadoTooltip
}) {
  return (
    <span
      role="tooltip"
      className={`pointer-events-none absolute z-30 w-max max-w-[15rem] whitespace-normal rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 dark:bg-gray-700 ${posicaoBalao[lado]}`}
    >
      {texto}
    </span>
  )
}

/** Envolve um conteúdo e mostra uma descrição ao passar o mouse. */
export function Tooltip({
  texto,
  children,
  className,
  lado = 'baixo',
}: {
  texto: string
  children: React.ReactNode
  className?: string
  lado?: LadoTooltip
}) {
  return (
    <span className={`group/tip relative ${className ?? 'inline-flex'}`}>
      {children}
      <TooltipBubble texto={texto} lado={lado} />
    </span>
  )
}

/** Título de sessão com dica ao passar o mouse (sublinhado pontilhado). */
export function TituloSessao({ titulo, dica }: { titulo: string; dica: string }) {
  return (
    <Tooltip texto={dica}>
      <span className="cursor-help border-b border-dotted border-gray-400 text-sm font-medium uppercase tracking-wide text-gray-400">
        {titulo}
      </span>
    </Tooltip>
  )
}

export function PageHeader({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: { href: string; label: string }
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-gray-500">{descricao}</p>}
      </div>
      {acao && (
        <Link href={acao.href} className={btnPrimary}>
          {acao.label}
        </Link>
      )}
    </div>
  )
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  )
}

export function ErroForm({ erro }: { erro?: string }) {
  if (!erro) return null
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {erro}
    </p>
  )
}

export function Tabela({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`border-b border-gray-200 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className = '',
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-gray-100 px-4 py-3 text-gray-700 dark:border-gray-800/60 dark:text-gray-300 ${className}`}
    >
      {children}
    </td>
  )
}

export function BadgeStatus({ status }: { status: StatusRegistro }) {
  return status === 'ativo' ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
      Ativo
    </span>
  ) : (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      Inativo
    </span>
  )
}

export function VazioTabela({ colunas, mensagem }: { colunas: number; mensagem: string }) {
  return (
    <tr>
      <td colSpan={colunas} className="px-4 py-10 text-center text-sm text-gray-400">
        {mensagem}
      </td>
    </tr>
  )
}
