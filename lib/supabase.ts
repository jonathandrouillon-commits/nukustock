import {
  createClient,
  type SupabaseClient,
} from '@supabase/supabase-js'

const supabaseUrl =
  process.env
    .NEXT_PUBLIC_SUPABASE_URL

const supabaseKey =
  process.env
    .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

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

/*
 * Singleton global.
 *
 * Très important :
 * toute l'application utilise exactement
 * le même client Supabase.
 */
const globalForSupabase =
  globalThis as unknown as {
    nukustockSupabase?:
      SupabaseClient
  }

export const supabase =
  globalForSupabase
    .nukustockSupabase ??
  createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        /*
         * Conserve la connexion
         * dans le navigateur.
         */
        persistSession:
          true,

        /*
         * Renouvelle automatiquement
         * le token.
         */
        autoRefreshToken:
          true,

        /*
         * Permet à Supabase de traiter
         * les informations Auth présentes
         * dans l'URL lorsque nécessaire.
         */
        detectSessionInUrl:
          true,
      },
    }
  )

/*
 * On conserve le singleton aussi
 * en production.
 */
globalForSupabase
  .nukustockSupabase =
  supabase