'use client'

/**
 * Botão de alternância claro/escuro. Alterna a classe `.dark` no <html> e
 * persiste a escolha em localStorage. A exibição do ícone/label é feita via CSS
 * (`dark:` variants), então não há divergência de hidratação.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function alternar() {
    const escuro = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('tema', escuro ? 'escuro' : 'claro')
    } catch {
      // localStorage indisponível — ignora
    }
  }

  const classe = compact
    ? 'flex items-center justify-center rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
    : 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro ou escuro"
      title="Alternar tema claro ou escuro"
      className={classe}
    >
      {/* Lua: visível no tema claro (clique para escurecer) */}
      <svg
        className="block dark:hidden"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {/* Sol: visível no tema escuro (clique para clarear) */}
      <svg
        className="hidden dark:block"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      {!compact && (
        <>
          <span className="dark:hidden">Modo escuro</span>
          <span className="hidden dark:inline">Modo claro</span>
        </>
      )}
    </button>
  )
}
