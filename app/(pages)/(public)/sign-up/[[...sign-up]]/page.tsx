// app/(pages)/(public)/sign-up/[[...sign-up]]/page.tsx
"use client"

/**
 * Custom sign-up flow for CLIENT users, built on Clerk Core 3's redesigned
 * useSignUp() hook. Method mapping from Core 2 → Core 3:
 *
 *   signUp.create({ emailAddress, password })   → signUp.password({ emailAddress, password, firstName, lastName })
 *   signUp.prepareEmailAddressVerification()    → signUp.verifications.sendEmailCode()
 *   signUp.attemptEmailAddressVerification()    → signUp.verifications.verifyEmailCode({ code })
 *   setActive({ session: createdSessionId })    → signUp.finalize({ navigate })
 *
 * Two internal steps in one component ("details" → "verify") because the
 * in-progress `signUp` resource lives in memory on Clerk's client SDK and
 * would be lost on a full route navigation.
 *
 * fullName is derived server-side (via the Clerk webhook) from
 * firstName + lastName — see app/api/webhooks/clerk/route.ts — so both
 * fields are collected here rather than a single "full name" input.
 *
 * See: https://clerk.com/docs/guides/development/custom-flows/authentication/email-password
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSignUp } from "@clerk/nextjs"
import { AuthShell } from "@/features/auth/components/auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, ArrowLeft, MailCheck, CheckCircle2,
} from "lucide-react"

type Step = "details" | "verify"

export default function SignUpPage() {
  const { signUp, errors, fetchStatus } = useSignUp()
  const router = useRouter()

  const [step, setStep] = useState<Step>("details")

  // Step 1 fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Step 2 field
  const [code, setCode] = useState("")

  const [formError, setFormError] = useState<string | null>(null)

  const isSubmitting = fetchStatus === "fetching"
  const passwordValid = password.length >= 8

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signUp.password({
      emailAddress: email,
      password,
      firstName,
      lastName,
      username: firstName + lastName
    })

    if (error) {
      setFormError(error.message ?? "Couldn't create your account. Please try again.")
      return
    }

    const { error: codeError } = await signUp.verifications.sendEmailCode()
    if (codeError) {
      setFormError(codeError.message ?? "Couldn't send a verification code. Please try again.")
      return
    }

    setStep("verify")
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const { error } = await signUp.verifications.verifyEmailCode({ code })
    if (error) {
      setFormError(error.message ?? "That code didn't work. Please check it and try again.")
      return
    }

    if (signUp.status === "complete") {
      const { error: finalizeError } = await signUp.finalize({
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
        setFormError(finalizeError.message ?? "Something went wrong finishing sign-up.")
      }
      return
    }

    setFormError("Verification did not complete. Please try again.")
  }

  const resendCode = async () => {
    setFormError(null)
    const { error } = await signUp.verifications.sendEmailCode()
    if (error) {
      setFormError(error.message ?? "Couldn't resend the code. Please try again in a moment.")
    }
  }

  // ── Step 2: verification ──────────────────────────────────────
  if (step === "verify") {
    return (
      <AuthShell
        variant="client"
        eyebrow="One more step"
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email}`}
      >
        <form onSubmit={handleVerify} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[12px] text-red-600">{formError}</p>
            </div>
          )}

          <div className="flex justify-center py-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
              <MailCheck size={26} className="text-primary" aria-hidden="true" />
            </div>
          </div>

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
            {isSubmitting ? "Verifying…" : "Verify and continue"}
            {!isSubmitting && <CheckCircle2 size={14} aria-hidden="true" />}
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
            onClick={() => setStep("details")}
            className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-sub transition-colors"
          >
            <ArrowLeft size={12} aria-hidden="true" />
            Back to details
          </button>
        </form>
      </AuthShell>
    )
  }

  // ── Step 1: account details ─────────────────────────────────────
  return (
    <AuthShell
      variant="client"
      eyebrow="Get started"
      title="Create your account"
      subtitle="Start planning your event with Fab Memories"
    >
      <form onSubmit={handleCreate} className="space-y-4">
        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] text-red-600">{formError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <div className="relative">
              <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
              <Input
                id="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Anna"
                className="pl-10"
              />
            </div>
            {errors?.fields?.firstName && (
              <p className="text-[11px] text-red-600">{errors.fields.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Reyes"
            />
            {errors?.fields?.lastName && (
              <p className="text-[11px] text-red-600">{errors.fields.lastName.message}</p>
            )}
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
          {errors?.fields?.emailAddress && (
            <p className="text-[11px] text-red-600">{errors.fields.emailAddress.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" aria-hidden="true" />
            <Input
              id="password"
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
          {!errors?.fields?.password && password.length > 0 && (
            <p className={`flex items-center gap-1.5 text-[11px] ${passwordValid ? "text-emerald-600" : "text-text-muted"}`}>
              {passwordValid && <CheckCircle2 size={11} aria-hidden="true" />}
              At least 8 characters
            </p>
          )}
        </div>

        {/* Required in Core 3 — Clerk's bot-protection widget mounts here when enabled */}
        <div id="clerk-captcha" />

        <Button type="submit" className="w-full" disabled={isSubmitting || !passwordValid}>
          {isSubmitting ? "Creating account…" : "Create account"}
          {!isSubmitting && <ArrowRight size={14} aria-hidden="true" />}
        </Button>

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-primary">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-[13px] text-text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
