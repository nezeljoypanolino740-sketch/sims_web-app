import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

/** True only when both variables are set to real values (not the .env.example text). */
export const isSupabaseConfigured =
  Boolean(url) &&
  Boolean(publishableKey) &&
  !url!.includes('your_supabase') &&
  !publishableKey!.includes('your_supabase');

/**
 * The single, shared Supabase client. It uses ONLY the publishable (anon)
 * key; what a signed-in user may do is decided by Row Level Security in the
 * database, never by this key or by the UI.
 */
export const supabase = createClient(
  isSupabaseConfigured ? url! : 'http://localhost:54321',
  isSupabaseConfigured ? publishableKey! : 'supabase-not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
