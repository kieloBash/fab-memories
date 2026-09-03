// app/(pages)/(public)/packages/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import Navbar from "@/features/landing/components/Navbar"
import Footer from "@/features/landing/components/Footer"
import { usePublicPackages } from "@/features/packages"
import { CheckCircle2, MapPin, ArrowRight, Sparkles, PackageSearch } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"
import { cn } from "@/lib/utils"
import type { EventType } from "@/app/generated/prisma/client"

const EVENT_TYPES: { value: EventType | "ALL"; label: string; emoji: string }[] = [
  { value: "ALL",        label: "All events",      emoji: "✨" },
  { value: "WEDDING",    label: "Wedding",         emoji: "💍" },
  { value: "DEBUT",      label: "Debut",           emoji: "🌸" },
  { value: "CORPORATE",  label: "Corporate Event", emoji: "🏢" },
  { value: "BIRTHDAY",   label: "Birthday",        emoji: "🎂" },
]

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(n)

export const dynamic = "force-dynamic"

export default function PublicPackagesPage() {
  const [eventType, setEventType] = useState<EventType | "ALL">("ALL")
  const [isProvincial, setIsProvincial] = useState(false)

  const { data: packages, isLoading, isError } = usePublicPackages()

  const filtered = packages?.filter((p) => eventType === "ALL" || p.eventType === eventType) ?? []

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative px-6 pt-20 pb-14 text-center overflow-hidden">
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(245,100,169,0.10) 0%, transparent 65%)" }}
          aria-hidden="true"
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
          className="relative max-w-2xl mx-auto"
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary mb-3">
            Service packages
          </p>
          <h1 className="text-[clamp(1.9rem,4vw,2.8rem)] font-bold tracking-tighter text-text-main mb-4">
            Every package, transparent pricing.
          </h1>
          <p className="text-[1rem] font-light text-text-sub leading-[1.7] max-w-lg mx-auto">
            Browse everything Fab Memories Events offers before you book —
            no calls, no waiting for a quote.
          </p>
        </motion.div>
      </section>

      {/* ── Filters ── */}
      <section className="px-6 max-w-5xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-border">
          {/* Event type filter */}
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => {
              const active = eventType === t.value
              return (
                <button
                  key={t.value}
                  onClick={() => setEventType(t.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-pill border-2 px-3.5 py-1.5 text-[12px] font-medium transition-all",
                    active
                      ? "border-primary bg-primary-soft text-primary shadow-primary-sm"
                      : "border-border bg-white text-text-sub hover:border-border-strong",
                  )}
                >
                  <span aria-hidden="true">{t.emoji}</span>
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Location toggle */}
          <div className="flex items-center gap-2 rounded-pill border border-border bg-background-blush p-1 self-start sm:self-auto">
            {[
              { key: false, label: "Metro Manila" },
              { key: true, label: "Provincial" },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                onClick={() => setIsProvincial(opt.key)}
                aria-pressed={isProvincial === opt.key}
                className={cn(
                  "rounded-pill px-3 py-1.5 text-[12px] font-medium transition-all",
                  isProvincial === opt.key
                    ? "bg-primary text-white shadow-primary-sm"
                    : "text-text-sub hover:text-text-main",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Package grid ── */}
      <section className="px-6 max-w-5xl mx-auto py-10">
        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 rounded-xl border border-border bg-background-blush animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-[13px] text-red-600">
            Couldn't load packages right now. Please refresh the page.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background-blush p-16 text-center">
            <PackageSearch size={28} className="text-primary" aria-hidden="true" />
            <p className="text-[14px] font-semibold text-text-main">No packages for this event type yet</p>
            <p className="text-[13px] text-text-muted">Try a different category above.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((pkg) => {
              const hasProvincePrice = !!pkg.priceProvincial && Number(pkg.priceProvincial) > 0
              const displayPrice = isProvincial && hasProvincePrice
                ? Number(pkg.priceProvincial)
                : Number(pkg.price)

              return (
                <motion.div
                  key={pkg.id}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: SPRING } }}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border-strong"
                >
                  <div>
                    <span className="inline-block text-[10px] font-semibold tracking-widest uppercase text-primary bg-primary-soft px-2.5 py-1 rounded-pill mb-2">
                      {EVENT_TYPES.find((t) => t.value === pkg.eventType)?.label ?? pkg.eventType}
                    </span>
                    <h3 className="text-[16px] font-semibold tracking-tight text-text-main leading-tight">
                      {pkg.name}
                    </h3>
                  </div>

                  <div>
                    <p className="text-[26px] font-bold tracking-tighter text-text-main">
                      {fmt(displayPrice)}
                    </p>
                    {isProvincial && !hasProvincePrice && (
                      <p className="flex items-center gap-1 text-[11px] text-text-muted mt-1">
                        <MapPin size={11} aria-hidden="true" />
                        Provincial — contact us for travel rates
                      </p>
                    )}
                  </div>

                  {pkg.description && (
                    <p className="text-[12px] text-text-sub leading-relaxed">{pkg.description}</p>
                  )}

                  <ul className="space-y-1.5 flex-1">
                    {pkg.inclusions.slice(0, 6).map((item) => (
                      <li key={item} className="flex items-start gap-2 text-[12px] text-text-sub">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {pkg.inclusions.length > 6 && (
                      <li className="text-[11px] text-text-muted pl-5">
                        +{pkg.inclusions.length - 6} more inclusions
                      </li>
                    )}
                  </ul>

                  <Link
                    href="/sign-up"
                    className="flex items-center justify-center gap-1.5 rounded-pill px-4 py-2.5 text-[13px] font-medium text-white shadow-primary-sm hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
                  >
                    Book this package
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </section>

      {/* ── Closing CTA ── */}
      <section className="px-6 py-20 text-center bg-background-blush">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-primary-sm">
            <Sparkles size={24} className="text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-[24px] font-bold tracking-tighter text-text-main">
            Don't see exactly what you need?
          </h2>
          <p className="text-[13px] text-text-sub leading-relaxed">
            Every package can be customized. Sign up and tell us what you have in mind —
            our team will work with you directly.
          </p>
          <Link
            href="/sign-up"
            className="flex items-center gap-2 rounded-pill px-6 py-3 text-[14px] font-medium text-white shadow-primary-sm hover:opacity-90 transition-all"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
          >
            Create your account
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
