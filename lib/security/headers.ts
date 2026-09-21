// lib/security/headers.ts
//
// One place for every HTTP security header the app sends.
//
//   • STATIC_SECURITY_HEADERS  → next.config.ts  (sent on every response, including static files)
//   • cspOptions               → proxy.ts        (Clerk builds the Content-Security-Policy with a fresh nonce per request)
//
// CSP starts in REPORT-ONLY mode: the browser logs what WOULD be blocked (DevTools → Console) but blocks nothing, so a
// mistake here cannot break sign-in. After you have clicked through the app with a clean console, set
//   CSP_ENFORCE=true
// in your environment (Vercel → Settings → Environment Variables) and redeploy to start enforcing.
//
// See docs/SECURITY_HEADERS.md.

import type { ClerkMiddlewareOptions } from "@clerk/nextjs/server"

export type CspOptions = NonNullable<ClerkMiddlewareOptions["contentSecurityPolicy"]>

/** Sent on every response. */
export const STATIC_SECURITY_HEADERS: { key: string; value: string }[] = [
  // HTTPS only, for two years. (No `preload`: that is very hard to undo.) Vercel serves HTTPS; browsers ignore this over http://localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Never guess a file's type from its content — stops an uploaded "image" being run as a script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Nobody may embed this app in a frame (clickjacking). The CSP below says the same with frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  // Do not leak full URLs (booking ids, filters) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these browser features.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
]

/** Origin of your Supabase project (payment-proof images are served from it via signed URLs). */
function supabaseOrigins(): string[] {
  const out = ["https://*.supabase.co"]
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) out.push(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin)
  } catch { /* ignore a malformed value */ }
  return out
}

export const CSP_ENFORCE = process.env.CSP_ENFORCE === "true"

/**
 * Passed to clerkMiddleware({ contentSecurityPolicy }). Clerk merges these with ITS defaults (its own sign-in frames, telemetry,
 * Google Maps script/connect, your Clerk frontend domain…) and adds a per-request nonce.
 *
 * strict: true → script-src becomes  'self' 'nonce-…' 'strict-dynamic'  — only scripts we (or a script we trust) load may run;
 *                injected inline scripts (XSS) are refused. The Google Maps script that venue-picker adds is allowed because a
 *                trusted script creates it.
 */
export const cspOptions: CspOptions = {
  strict: true,
  reportOnly: !CSP_ENFORCE,
  directives: {
    // payment-proof previews (signed Supabase URLs, blob: while choosing a file), Google Maps tiles/icons, Clerk avatars
    "img-src": ["'self'", "data:", "blob:", ...supabaseOrigins(), "https://maps.gstatic.com", "https://maps.googleapis.com", "https://img.clerk.com"],
    // the browser talks to Supabase only for signed image URLs; Maps Places autocomplete calls maps.googleapis.com
    "connect-src": [...supabaseOrigins(), "https://maps.googleapis.com"],
    // the Maps Places widget pulls a small stylesheet + font
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    // nothing may embed the app, load plugins, change <base>, or post forms elsewhere
    "frame-ancestors": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  },
}
