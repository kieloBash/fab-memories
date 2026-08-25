// lib/supabase/client.ts
/**
 * Browser-side Supabase client (anon key).
 * Lazy-initialized — env vars are only checked when the client is first used,
 * not at module evaluation time. This prevents build errors when env vars
 * are not present in the build environment.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    )
  }

  _client = createClient(url, key)
  return _client
}

/** Convenience export — wraps the lazy client so callers use supabase.storage directly */
export const supabase = {
  get storage() {
    return getSupabaseClient().storage
  },
}
