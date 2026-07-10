import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/** Client do Supabase para uso em Client Components ('use client'). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
