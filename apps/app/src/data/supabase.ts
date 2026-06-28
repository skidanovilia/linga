import { createClient } from '@supabase/supabase-js'

// Supabase client. Content is read with the anon key (public-read); once a user
// signs in, the client attaches their JWT automatically, so per-user review
// progress is read/written under RLS through the same client. Values come from
// Vite env (`apps/app/.env.local`, copied from `.env.example`). See apps/db.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy apps/app/.env.example to apps/app/.env.local.',
  )
}

export const supabase = createClient(url, anonKey, {
  // Persist the session in localStorage and refresh it in the background so a
  // signed-in user stays signed in across reloads.
  auth: { persistSession: true, autoRefreshToken: true },
})
