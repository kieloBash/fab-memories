// app/(pages)/(public)/sign-in/[[...sign-in]]/page.tsx
"use client"

/**
 * CLIENT sign-in — email address (or username) + password.
 *
 * This page is for CLIENT accounts only. Staff (ADMIN / COORDINATOR / VENDOR) sign in at /staff-login.
 * Both pages share the same finishing step (features/auth/finish-sign-in.ts): after Clerk accepts the password,
 * the server is asked whether this account belongs on THIS page (POST /api/auth/portal-check { portal: "client" }).
 * A staff account used here is refused, its session revoked, and the browser returns here with ?error=WRONG_PORTAL.
 *
 * FIX: this file had been overwritten with a copy of the staff-login page, so it asked the server about the
 * "staff" portal — every client was refused and bounced to /staff-login, while staff could sign in here.
 *
 * Clerk Core 3 note: signIn.password() takes the identifier under `emailAddress`; Clerk resolves an email
 * address or a username through that field (same as /staff-login — see the note in that file).
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useClerk, useSignIn } from "@clerk/nextjs"
import { finishSignIn, navigateTo, useSignInErrorFromUrl } from "@/features/auth/finish-sign-in"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const { signOut } = useClerk()
  const router = useRouter()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  // A refused sign-in comes back to this page as ?error=<code> — show why.
  useSignInErrorFromUrl("client", setFormError)

  const isSubmitting = fetchStatus === "fetching"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signIn.password({
      emailAddress: identifier.trim(),
      password,
    })

    if (error) {
      setFormError(error.message ?? "Couldn't sign in. Check your email address and password.")
      return
    }

    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
          await finishSignIn({
            portal: "client",
            session: session as any,
            decorateUrl,
            navigate: navigateTo(router.push),
            signOut: (opts) => signOut(opts),
            onError: setFormError,
          })
        },
      })
      if (finalizeError) {
        setFormError(finalizeError.message ?? "Something went wrong finishing sign-in.")
      }
      return
    }

    if (signIn.status === "needs_second_factor") {
      setFormError("Two-factor verification is required for this account. Please contact support.")
      return
    }

    if (signIn.status === "needs_client_trust") {
      setFormError("We don't recognize this device. Please contact support to verify your sign-in.")
      return
    }

    setFormError("Sign-in did not complete. Please try again.")
  }

  return (
    <AuthShell
      variant="client"
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Track your bookings, payments and event details"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-red-600">{formError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email address/username</Label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-[12px] font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-sub transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
            </button>
          </div>
          {errors?.fields?.password && (
            <p className="text-[11px] text-red-600">{errors.fields.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
          {!isSubmitting && <ArrowRight size={14} aria-hidden="true" />}
        </Button>
      </form>

      <p className="mt-6 text-center text-[12px] text-text-muted">
        New to Fab Memories?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-3 text-center text-[12px] text-text-muted">
        Fab Memories staff or vendor?{" "}
        <Link href="/staff-login" className="font-medium text-primary hover:underline">
          Staff sign-in
        </Link>
      </p>
    </AuthShell>
  )
}
