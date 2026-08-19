import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL manquante'
  )
}

if (!supabaseKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquante'
  )
}

const isBrowser =
  typeof window !== 'undefined'

const isBarNuku =
  isBrowser &&
  window.location.hostname
    .toLowerCase() ===
    'barnuku.fenuaprobartender.com'

const authStorage =
  isBrowser
    ? isBarNuku
      ? window.sessionStorage
      : window.localStorage
    : undefined

const globalForSupabase =
  globalThis as unknown as {
    nukustockSupabase?: SupabaseClient
  }

export const supabase =
  globalForSupabase.nukustockSupabase ??
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,

        /*
         * BAR NUKU :
         * sessionStorage = session propre
         * à chaque onglet.
         *
         * NUKUSTOCK :
         * localStorage classique.
         */
        ...(authStorage
          ? {
              storage:
                authStorage,
            }
          : {}),
      },
    }
  )

globalForSupabase
  .nukustockSupabase =
  supabase