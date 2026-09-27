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
 */
import { signInErrorMessage, signInErrorUrl, type Portal } from "@/lib/clerk/portal"
import { useEffect, useState } from "react"
import { useAuth, useClerk } from "@clerk/nextjs"
import { checkPortal, endExpiredSession } from "@/features/auth/portal-check"

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
 * Shows the refusal carried in `?error=<code>` after the sign-out redirect. Only known codes produce a specific
 * message (lib/clerk/portal.ts); the code is removed from the address bar afterwards.
 *
 * SESSION_EXPIRED is special: proxy.ts sends a session older than SESSION_MAX_AGE here while the browser is STILL
 * signed in. Once Clerk has loaded, the page ends that session on the server (revoke + audit, best-effort) and signs
 * the browser out, coming back to this same page with the code — that second visit is signed out and only shows the
 * message, so this cannot loop.
 */
export function useSignInErrorFromUrl(portal: Portal, setError: (message: string) => void) {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const [expiredWhileSignedIn, setExpiredWhileSignedIn] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("error")
    if (!code) return
    setError(signInErrorMessage(code, portal))
    if (code === "SESSION_EXPIRED") setExpiredWhileSignedIn(true)
    params.delete("error")
    const rest = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""))
  }, [portal, setError])

  useEffect(() => {
    if (!expiredWhileSignedIn || !isLoaded || !isSignedIn) return
    let cancelled = false
    void (async () => {
      await endExpiredSession()
      if (cancelled) return
      try { await signOut({ redirectUrl: signInErrorUrl(portal, "SESSION_EXPIRED") }) } catch { /* already signed out */ }
    })()
    return () => { cancelled = true }
  }, [expiredWhileSignedIn, isLoaded, isSignedIn, portal, signOut])
}
