// app/(pages)/(public)/support/page.tsx

import Navbar from "@/features/landing/components/Navbar"
import Footer from "@/features/landing/components/Footer"
import Link from "next/link"
import { LifeBuoy, Mail, MapPin, Clock, ArrowRight } from "lucide-react"

export const metadata = {
  title: "Support — Fab Memories Events",
}

const FAQS = [
  {
    q: "How long until my booking is confirmed?",
    a: "After you submit a booking request, our team typically reaches out within 1–2 business days to discuss contract terms, deposit amount, and payment plan.",
  },
  {
    q: "What payment methods do you accept?",
    a: "GCash, Maya, Bank Transfer, Cheque (for deposits only), and Cash. You'll submit proof of payment through your account and our staff will verify it.",
  },
  {
    q: "Can I change my event details after booking?",
    a: "You can edit your booking while it's still Pending. Once confirmed, contact our team directly to discuss changes.",
  },
  {
    q: "Do you serve locations outside Metro Manila?",
    a: "Yes — we regularly serve Tagaytay, Cavite, Laguna, and Batangas. Provincial rates apply and are shown when you select your venue.",
  },
]

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
            <LifeBuoy size={20} className="text-primary" aria-hidden="true" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tighter text-text-main">
            Support
          </h1>
        </div>
        <p className="text-[13px] text-text-sub leading-relaxed mb-10">
          Have a question about your booking, a payment, or anything else? We're here to help.
        </p>

        {/* Contact cards */}
        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          <div className="rounded-xl border border-border bg-white p-5 space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
              <Mail size={16} className="text-primary" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-text-main">Email us</p>
            <a href="mailto:hello@fabmemoriesevents.com" className="text-[13px] text-primary hover:underline">
              hello@fabmemoriesevents.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-white p-5 space-y-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
              <Clock size={16} className="text-primary" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-text-main">Response time</p>
            <p className="text-[13px] text-text-sub">Within 1–2 business days</p>
          </div>

          <div className="rounded-xl border border-border bg-white p-5 space-y-2 sm:col-span-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
              <MapPin size={16} className="text-primary" aria-hidden="true" />
            </div>
            <p className="text-[13px] font-semibold text-text-main">Coverage areas</p>
            <p className="text-[13px] text-text-sub">
              Metro Manila · Tagaytay · Cavite · Laguna · Batangas
            </p>
          </div>
        </div>

        {/* FAQ */}
        <h2 className="text-[15px] font-semibold tracking-tight text-text-main mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-5 mb-12">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-background-blush p-5">
              <p className="text-[13px] font-semibold text-text-main mb-1.5">{f.q}</p>
              <p className="text-[13px] text-text-sub leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        {/* Existing account CTA */}
        <div className="rounded-xl border border-border bg-white p-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[13px] font-semibold text-text-main">Already have a booking?</p>
            <p className="text-[12px] text-text-muted mt-0.5">Sign in to track its status directly.</p>
          </div>
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 rounded-pill px-4 py-2 text-[13px] font-medium text-white shadow-primary-sm hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
          >
            Sign in
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
