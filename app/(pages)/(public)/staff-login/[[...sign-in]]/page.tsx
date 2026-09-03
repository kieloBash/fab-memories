// app/(pages)/(public)/staff-login/[[...sign-in]]/page.tsx
"use client"

/**
 * Custom staff sign-in flow — username + password only, no sign-up path.
 * Built on Clerk Core 3's useSignIn() hook (same API as the client
 * /sign-in page — see that file for the full Core 2 → Core 3 mapping).
 *
 * Note on the `emailAddress` field name: Clerk's Core 3 `signIn.password()`
 * method takes its identifier under a parameter literally named
 * `emailAddress` in the current docs, even though this app signs staff in
 * by username. In testing, Clerk resolves whatever identifier type is
 * passed (username, email, or phone) through this same field — but if
 * your Clerk instance rejects a username here, check the Username
 * sign-in toggle under User & Authentication in the Clerk Dashboard and
 * confirm with Clerk's current docs for username-specific behavior.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSignIn } from "@clerk/nextjs"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, UserCog, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"

export default function StaffLoginPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isSubmitting = fetchStatus === "fetching"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signIn.password({
      emailAddress: username,
      password,
    })

    if (error) {
      setFormError(error.message ?? "Couldn't sign in. Check your username and password.")
      return
    }

    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            console.log(session.currentTask)
            return
          }
          const url = decorateUrl("/staff")
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
      setFormError("Two-factor verification is required. Please contact your administrator.")
      return
    }

    if (signIn.status === "needs_client_trust") {
      setFormError("We don't recognize this device. Please contact your administrator to verify your sign-in.")
      return
    }

    setFormError("Sign-in did not complete. Please try again.")
  }

  return (
    <AuthShell
      variant="staff"
      eyebrow="Staff access"
      title="Sign in to your account"
      subtitle="For Fab Memories Events administrators, coordinators, and vendors"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-red-600">{formError}</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <UserCog size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="username"
              type="text"
              autoComplete="username"
              autoCapitalize="off"
              autoCorrect="off"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin, coordinator"
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

      <p className="mt-6 text-center text-[12px] text-text-muted">
        Don't have staff access? Contact your administrator to have an account created.
      </p>

      <p className="mt-3 text-center text-[12px] text-text-muted">
        Looking to book an event?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Client sign in
        </Link>
      </p>
    </AuthShell>
  )
}
