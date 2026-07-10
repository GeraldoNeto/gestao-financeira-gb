import Link from 'next/link'

/** Abas Empresas/Pessoas para as telas de lançamentos. */
export function TabsTipo({ base, tipo }: { base: string; tipo: 'empresa' | 'pessoa' }) {
  const cls = (ativo: boolean) =>
    ativo
      ? 'rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white'
      : 'rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
  return (
    <div className="mb-4 flex gap-2">
      <Link href={`${base}?tipo=empresa`} className={cls(tipo === 'empresa')}>
        Empresas
      </Link>
      <Link href={`${base}?tipo=pessoa`} className={cls(tipo === 'pessoa')}>
        Pessoas Físicas
      </Link>
    </div>
  )
}
