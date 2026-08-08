import { createClient } from '@supabase/supabase-js'

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const supabaseUrl = viteEnv.VITE_SUPABASE_URL
const supabasePublishableKey = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: 'self-recorder.supabase.auth',
      },
    })
  : null
