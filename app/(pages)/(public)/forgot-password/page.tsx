// app/(pages)/(public)/forgot-password/page.tsx
"use client"

/**
 * Custom password reset flow, built on Clerk Core 3's useSignIn() hook.
 * The reset-password strategy has its own dedicated sub-object in Core 3:
 *
 *   Step 1  signIn.create({ identifier })          — starts the sign-in attempt
 *           signIn.resetPasswordEmailCode.sendCode()  — sends the code
 *   Step 2  signIn.resetPasswordEmailCode.verifyCode({ code })
 *   Step 3  signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions })
 *           signIn.finalize({ navigate })          — activates the session
 *
 * Three steps rendered from one component because the in-progress
 * `signIn` resource lives in memory on Clerk's client SDK and would be
 * lost on a full route navigation. Step transitions follow `signIn.status`
 * directly (not local step state) for steps 2→3, matching Clerk's own
 * reference implementation.
 *
 * See: https://clerk.com/docs/guides/development/custom-flows/authentication/forgot-password
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSignIn } from "@clerk/nextjs"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle, Mail, Lock, Eye, EyeOff,
  ArrowRight, ArrowLeft, KeyRound, CheckCircle2,
} from "lucide-react"

export default function ForgotPasswordPage() {
  const { signIn, errors, fetchStatus } = useSignIn()
  const router = useRouter()

  const [codeSent, setCodeSent] = useState(false)
  const [done, setDone]         = useState(false)

  const [email, setEmail]       = useState("")
  const [code, setCode]         = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [formError, setFormError] = useState<string | null>(null)

  const isSubmitting  = fetchStatus === "fetching"
  const passwordValid = password.length >= 8

  // ── Step 1: send the reset code ─────────────────────────────────
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error: createError } = await signIn.create({ identifier: email })
    if (createError) {
      setFormError(createError.message ?? "Couldn't find an account with that email.")
      return
    }

    const { error: sendCodeError } = await signIn.resetPasswordEmailCode.sendCode()
    if (sendCodeError) {
      setFormError(sendCodeError.message ?? "Couldn't send a reset code. Please try again.")
      return
    }

    setCodeSent(true)
  }

  // ── Step 2: verify the code ─────────────────────────────────────
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code })
    if (error) {
      setFormError(error.message ?? "That code didn't work. Please check it and try again.")
    }
    // On success, signIn.status becomes 'needs_new_password' and the
    // component re-renders into step 3 automatically.
  }

  // ── Step 3: submit the new password ─────────────────────────────
  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signIn.resetPasswordEmailCode.submitPassword({
      password,
      signOutOfOtherSessions: true,
    })
    if (error) {
      setFormError(error.message ?? "Couldn't reset your password. Please try again.")
      return
    }

    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize({
        navigate: async ({ session, decorateUrl }) => {
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
        return
      }
      setDone(true)
      return
    }

    if (signIn.status === "needs_second_factor") {
      setFormError("Two-factor verification is required. Please contact support.")
      return
    }

    setFormError("Password reset did not complete. Please try again.")
  }

  const resendCode = async () => {
    setFormError(null)
    const { error } = await signIn.resetPasswordEmailCode.sendCode()
    if (error) {
      setFormError(error.message ?? "Couldn't resend the code. Please try again in a moment.")
    }
  }

  // ── Step 4: success ──────────────────────────────────────────
  if (done) {
    return (
      <AuthShell
        variant="client"
        eyebrow="All set"
        title="Password reset"
        subtitle="Your password has been updated"
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <CheckCircle2 size={26} className="text-emerald-600" aria-hidden="true" />
          </div>
          <p className="text-[13px] text-text-muted text-center">
            You're signed in with your new password.
          </p>
          <Button className="w-full" onClick={() => router.push("/portal")}>
            Continue to your account
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        </div>
      </AuthShell>
    )
  }

  // ── Step 3 UI: new password (signIn.status drives this, not local state) ──
  if (signIn?.status === "needs_new_password") {
    return (
      <AuthShell
        variant="client"
        eyebrow="Almost done"
        title="Set a new password"
        subtitle="Choose a new password for your account"
      >
        <form onSubmit={submitNewPassword} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[12px] text-red-600">{formError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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

          <Button type="submit" className="w-full" disabled={isSubmitting || !passwordValid}>
            {isSubmitting ? "Resetting…" : "Reset password"}
            {!isSubmitting && <ArrowRight size={14} aria-hidden="true" />}
          </Button>
        </form>
      </AuthShell>
    )
  }

  // ── Step 2 UI: enter the code ────────────────────────────────────
  if (codeSent) {
    return (
      <AuthShell
        variant="client"
        eyebrow="Reset password"
        title="Check your email"
        subtitle={`Enter the code we sent to ${email}`}
      >
        <form onSubmit={verifyCode} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[12px] text-red-600">{formError}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="text-center text-[18px] tracking-[0.3em] font-semibold"
            />
            {errors?.fields?.code && (
              <p className="text-[11px] text-red-600">{errors.fields.code.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || code.length < 6}>
            {isSubmitting ? "Verifying…" : "Verify code"}
            {!isSubmitting && <ArrowRight size={14} aria-hidden="true" />}
          </Button>

          <button
            type="button"
            onClick={resendCode}
            className="w-full text-center text-[12px] text-text-muted hover:text-primary transition-colors"
          >
            Didn't get a code? Resend
          </button>

          <button
            type="button"
            onClick={() => setCodeSent(false)}
            className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-sub transition-colors"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Use a different email
          </button>
        </form>
      </AuthShell>
    )
  }

  // ── Step 1 UI: request code ────────────────────────────────────────
  return (
    <AuthShell
      variant="client"
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a reset code"
    >
      <form onSubmit={sendCode} className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-red-600">{formError}</p>
          </div>
        )}

        <div className="flex justify-center py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <KeyRound size={26} className="text-primary" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pl-10"
            />
          </div>
          {errors?.fields?.identifier && (
            <p className="text-[11px] text-red-600">{errors.fields.identifier.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending code…" : "Send reset code"}
          {!isSubmitting && <ArrowRight size={14} aria-hidden="true" />}
        </Button>
      </form>

      <Link
        href="/sign-in"
        className="mt-6 flex items-center justify-center gap-1.5 text-[13px] text-text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Back to sign in
      </Link>
    </AuthShell>
  )
}
