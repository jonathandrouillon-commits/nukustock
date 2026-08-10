import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL manquante')
}

if (!supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante')
}

const globalForSupabase = globalThis as unknown as {
  nukustockSupabase?: SupabaseClient
}

export const supabase =
  globalForSupabase.nukustockSupabase ??
  createClient(supabaseUrl, supabaseKey)

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.nukustockSupabase = supabase
}