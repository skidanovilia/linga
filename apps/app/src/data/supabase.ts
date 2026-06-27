import { createClient } from '@supabase/supabase-js'

// Read-only anon access to the local Supabase. Values come from Vite env
// (`apps/app/.env.local`, copied from `.env.example`). See apps/superbase.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy apps/app/.env.example to apps/app/.env.local.',
  )
}

export const supabase = createClient(url, anonKey)
