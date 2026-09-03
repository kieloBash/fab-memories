// app/(pages)/(public)/sign-in/[[...sign-in]]/page.tsx
"use client"

/**
 * Custom sign-in flow for CLIENT users, built on Clerk Core 3's redesigned
 * useSignIn() hook. Core 3 replaced the old create()/setActive()/isLoaded
 * pattern:
 *
 *   Core 2                                    Core 3
 *   { isLoaded, signIn, setActive }        →  { signIn, errors, fetchStatus }
 *   signIn.create({ identifier, password })→  signIn.password({ emailAddress, password })
 *   setActive({ session: createdSessionId})→  signIn.finalize({ navigate })
 *
 * See: https://clerk.com/docs/guides/development/custom-flows/authentication/email-password
 */

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { useSignIn } from "@clerk/nextjs"
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignInPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()

  // const [email, setEmail] = useState("")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isSubmitting = fetchStatus === "fetching"

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("submitting")
    e.preventDefault()
    setFormError(null)

    const { error } = await signIn.password({
      identifier,
      password,
    })

    if (error) {
      setFormError(error.message ?? "Couldn't sign in. Check your email and password.")
      return
    }

    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
          // Session tasks (e.g. reset-password, setup-mfa) aren't configured
          // for CLIENT accounts in this app — fall through to /portal.
          if (session?.currentTask) {
            console.log(session.currentTask)
            return
          }
          const url = decorateUrl("/portal")
          if (url.startsWith("http")) {
            window.location.href = url
          } else {
            router.push(url)
          }
        },
      })
      if (finalizeError) {
        setFormError(finalizeError.message ?? "Something went wrong finishing sign-in.")
      }
      return
    }

    if (signIn.status === "needs_second_factor") {
      setFormError("Two-factor verification is required. Please contact support.")
      return
    }

    if (signIn.status === "needs_client_trust") {
      // Device Trust — signing in from an unfamiliar device with a password.
      // Full handling requires an email-code verification step; not yet
      // implemented in this flow. See Clerk's Device Trust docs.
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
      subtitle="Track your booking, payments, and documents"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-red-600">{formError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email address/Username</Label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="identifier"
              // type="email"
              // autoComplete="email"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com/username"
              className="pl-10"
            />
          </div>
          {/* {errors?.fields?.emailAddress && (
            <p className="text-[11px] text-red-600">{errors.fields.emailAddress.message}</p>
          )} */}
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

      <p className="mt-6 text-center text-[13px] text-text-muted">
        Don't have an account?{" "}
        <Link href="/sign-up" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>

      {/* <p className="mt-3 text-center text-[12px] text-text-muted">
        Fab Memories Events staff?{" "}
        <Link href="/staff-login" className="font-medium text-text-sub hover:text-primary hover:underline">
          Staff sign in
        </Link>
      </p> */}
    </AuthShell>
  )
}
