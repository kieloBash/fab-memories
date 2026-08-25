// lib/supabase/server.ts
/**
 * Server-side Supabase client (service role key).
 * Lazy-initialized — env vars are only checked when the client is first used,
 * not at module evaluation time. This prevents build errors when env vars
 * are not present in the build environment.
 *
 * NEVER expose this client or its key to the browser.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _adminClient: SupabaseClient | null = null

export function getSupabaseAdminClient(): SupabaseClient {
  if (_adminClient) return _adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    )
  }

  _adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return _adminClient
}

/** Convenience export — wraps the lazy admin client */
export const supabaseAdmin = {
  get storage() {
    return getSupabaseAdminClient().storage
  },
}
