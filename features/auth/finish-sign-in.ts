// features/auth/finish-sign-in.ts
"use client"

/**
 * The last step of every sign-in in this app — /sign-in, /staff-login and /forgot-password all call this from
 * Clerk's `signIn.finalize({ navigate })` callback, so the three behave the same:
 *
 *   1. A pending Clerk session task (e.g. "reset-password") → explained, not silently ignored.
 *   2. Ask the server whether this account belongs on this login page (checkPortal — fails closed). This also
 *      repairs an account whose database row is missing (see lib/sync-user.ts).
 *   3. Refused → show the message AND sign the browser out, returning to the SAME login page with ?error=<code>
 *      (Clerk's signOut() navigates; without a redirectUrl it went to "/", so the user never saw why).
 *   4. Allowed → go to the dashboard the server names.
 *
 * CHANGE: the SESSION_EXPIRED handling in useSignInErrorFromUrl is removed (custom session expiry removed — Clerk
 * manages session lifetime). An ended Clerk session arrives here already signed out, so there is nothing to end.
 */
import { checkPortal } from "@/features/auth/portal-check"
import { signInErrorMessage, signInErrorUrl, type Portal } from "@/lib/clerk/portal"
import { useEffect } from "react"

type SessionLike = { currentTask?: { key?: string } | null; getToken: () => Promise<string | null> } | null | undefined

export interface FinishSignInArgs {
  portal: Portal
  session: SessionLike
  decorateUrl: (url: string) => string
  navigate: (url: string) => void
  signOut: (opts: { redirectUrl: string }) => Promise<unknown>
  onError: (message: string) => void
}

/** Returns the destination on success, or null when the sign-in was refused. */
export async function finishSignIn({ portal, session, decorateUrl, navigate, signOut, onError }: FinishSignInArgs): Promise<string | null> {
  const refuse = async (code: string) => {
    onError(signInErrorMessage(code, portal))
    try { await signOut({ redirectUrl: signInErrorUrl(portal, code) }) } catch { /* the server may already have revoked it */ }
    return null
  }

  if (session?.currentTask) {
    return refuse(session.currentTask.key === "reset-password" ? "RESET_PASSWORD_REQUIRED" : "SESSION_TASK")
  }

  const check = await checkPortal(portal, () => session?.getToken())
  if (!check.ok) return refuse(check.code)

  const url = decorateUrl(check.destination)
  navigate(url)
  return check.destination
}

/** Navigates like the login pages always did: full reload for absolute URLs, client-side push otherwise. */
export function navigateTo(push: (url: string) => void) {
  return (url: string) => {
    if (url.startsWith("http")) window.location.href = url
    else push(url)
  }
}

/**
 * Shows the refusal carried in `?error=<code>` after a sign-out redirect. Only known codes produce a specific
 * message (lib/clerk/portal.ts); the code is removed from the address bar afterwards.
 * Same signature as before — the login pages need no changes.
 */
export function useSignInErrorFromUrl(portal: Portal, setError: (message: string) => void) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("error")
    if (!code) return
    setError(signInErrorMessage(code, portal))
    params.delete("error")
    const rest = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""))
  }, [portal, setError])
}