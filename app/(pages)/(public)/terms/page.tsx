// app/(pages)/(public)/terms/page.tsx

import Navbar from "@/features/landing/components/Navbar"
import Footer from "@/features/landing/components/Footer"
import { ClipboardList } from "lucide-react"

export const metadata = {
  title: "Terms of Service — Fab Memories Events",
}

const SECTIONS = [
  {
    heading: "1. Booking requests",
    body: "Submitting a booking request through this platform does not guarantee your event date. A booking is only confirmed once our team has reviewed your request, agreed on contract terms (price, payment plan, and deposit), and verified your deposit payment.",
  },
  {
    heading: "2. One event per day",
    body: "Fab Memories Events accepts one confirmed event per calendar date. If your requested date becomes unavailable before your deposit is verified, we will contact you to discuss alternative dates.",
  },
  {
    heading: "3. Payments",
    body: "We accept GCash, Maya, Bank Transfer, Cheque (deposit only), and Cash. All payments are verified manually by our staff. Once a payment is marked as Verified, it cannot be altered — if there is an error, please contact us directly.",
  },
  {
    heading: "4. Cancellations",
    body: "Clients may request cancellation of a confirmed booking through the platform. Cancellation requests are reviewed by our team; refund eligibility depends on how close the request is to your event date and the payment plan agreed upon at booking.",
  },
  {
    heading: "5. Vendor coordination",
    body: "Vendors assigned to your event are contracted directly by Fab Memories Events. We coordinate scope, availability, and scheduling on your behalf as part of your package.",
  },
  {
    heading: "6. Account responsibility",
    body: "You are responsible for keeping your account credentials confidential and for all activity under your account. Notify us immediately if you suspect unauthorized access.",
  },
  {
    heading: "7. Changes to these terms",
    body: "We may update these terms from time to time. Continued use of the platform after changes take effect constitutes acceptance of the updated terms.",
  },
]

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <section className="px-6 py-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
            <ClipboardList size={20} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-[26px] font-bold tracking-tighter text-text-main">
              Terms of Service
            </h1>
            <p className="text-[12px] text-text-muted">Last updated September 2026</p>
          </div>
        </div>

        <p className="text-[13px] text-text-sub leading-relaxed mb-10">
          These terms govern your use of the Fab Memories Events booking platform.
          By creating an account or submitting a booking, you agree to the terms below.
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
            Questions about these terms? Reach out through our{" "}
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
