'use client'

import { useActionState } from 'react'
import { inputClass } from '@/components/ui'
import { Td } from '@/components/ui'
import { alterarUsuario, type UsuarioState } from './actions'
import type { Perfil } from '@/lib/database.types'

export function LinhaUsuario({ usuario, ehVoce }: { usuario: Perfil; ehVoce: boolean }) {
  const action = alterarUsuario.bind(null, usuario.id)
  const [state, formAction, pending] = useActionState<UsuarioState, FormData>(action, undefined)

  const pendente = usuario.status === 'pendente'

  return (
    <tr className={pendente ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
      <Td className="font-medium text-gray-900 dark:text-gray-100">
        {usuario.nome}
        {ehVoce && <span className="ml-2 text-xs text-emerald-600">(você)</span>}
        {pendente && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            aguardando
          </span>
        )}
      </Td>
      <Td className="text-gray-500">{usuario.email ?? '—'}</Td>
      <Td colSpan={2}>
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <select name="perfil" defaultValue={usuario.perfil} className={`${inputClass} w-40`}>
            <option value="administrador">Administrador</option>
            <option value="operador">Operador</option>
            <option value="consulta">Consulta</option>
          </select>
          <select name="status" defaultValue={usuario.status} className={`${inputClass} w-36`}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="pendente">Pendente</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? '…' : 'Salvar'}
          </button>
          {state?.ok && <span className="text-xs text-emerald-600">Salvo</span>}
          {state?.error && <span className="text-xs text-red-500">{state.error}</span>}
        </form>
      </Td>
    </tr>
  )
}
