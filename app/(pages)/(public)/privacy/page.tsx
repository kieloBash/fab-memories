// app/(pages)/(public)/privacy/page.tsx

import Navbar from "@/features/landing/components/Navbar"
import Footer from "@/features/landing/components/Footer"
import { ShieldCheck } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Fab Memories Events",
}

const SECTIONS = [
  {
    heading: "Information we collect",
    body: "When you create an account or submit a booking request, we collect your name, email address, mobile number, and event details (date, venue, guest count, and package preferences). When you submit payment proof, we collect the payment method, reference number, and any screenshot you upload.",
  },
  {
    heading: "How we use your information",
    body: "We use your information to process your booking, verify payments, coordinate vendors and staff for your event, and communicate with you about your booking status. We do not sell your personal information to third parties.",
  },
  {
    heading: "Payment information",
    body: "We do not process payments directly through a third-party payment gateway. Payment proof (screenshots or reference numbers) you submit is reviewed manually by our staff for verification purposes and stored securely.",
  },
  {
    heading: "Data sharing with vendors",
    body: "When we assign a vendor to your event, we share only the event details relevant to their service category (date, venue, guest count) — never your contact information or payment details.",
  },
  {
    heading: "Data retention",
    body: "We retain booking and payment records for as long as necessary to fulfill our services and comply with our accounting and audit obligations. You may request deletion of your account by contacting us directly.",
  },
  {
    heading: "Your rights",
    body: "You may access, update, or request deletion of your personal information at any time through your account settings, or by contacting us at the details on our Support page.",
  },
  {
    heading: "Changes to this policy",
    body: "We may update this policy from time to time. We'll note the effective date below whenever changes are made.",
  },
]

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
            <ShieldCheck size={20} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold tracking-tighter text-text-main">
              Privacy Policy
            </h1>
            <p className="text-[12px] text-text-muted">Last updated September 2026</p>
          </div>
        </div>

        <p className="text-[13px] text-text-sub leading-relaxed mb-10">
          Fab Memories Events ("we," "us," or "our") respects your privacy. This policy
          explains what information we collect through our booking platform, how we use
          it, and the choices you have.
        </p>

        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <h2 className="text-[15px] font-semibold tracking-tight text-text-main mb-2">
                {s.heading}
              </h2>
              <p className="text-[13px] text-text-sub leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-background-blush p-5">
          <p className="text-[12px] text-text-muted leading-relaxed">
            Questions about this policy? Reach out through our{" "}
            <a href="/support" className="text-primary font-medium hover:underline">
              Support page
            </a>.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
