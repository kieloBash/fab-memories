// features/auth/components/auth-shell.tsx
"use client"

/**
 * AuthShell
 *
 * Shared split-panel layout for every custom auth page (sign-in, sign-up,
 * staff-login, forgot-password). Left panel carries brand storytelling for
 * client-facing pages; the "staff" variant swaps this for a more
 * utilitarian, internal-tool framing so staff never mistake this for the
 * public marketing site.
 */

import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, ShieldCheck, CalendarHeart, CreditCard } from "lucide-react"
import { SPRING } from "@/lib/framer/framer-utils"

interface AuthShellProps {
  children: React.ReactNode
  variant?: "client" | "staff"
  /** Small eyebrow shown above the form, e.g. "Welcome back" */
  eyebrow?: string
  title: string
  subtitle?: string
}

const CLIENT_HIGHLIGHTS = [
  { icon: CalendarHeart, text: "Real-time booking status, no more chasing updates" },
  { icon: CreditCard,    text: "Submit payment proof and track verification instantly" },
  { icon: ShieldCheck,   text: "Every step of your event, organized in one place" },
]

export function AuthShell({ children, variant = "client", eyebrow, title, subtitle }: AuthShellProps) {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — brand storytelling (client) or utilitarian (staff) ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-10 relative overflow-hidden"
        style={
          variant === "client"
            ? { background: "linear-gradient(160deg, var(--primary) 0%, var(--primary-deep) 100%)" }
            : { backgroundColor: "#1a0a12" }
        }
      >
        {/* Ambient orb — client variant only, keeps staff panel calmer */}
        {variant === "client" && (
          <motion.div
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.12) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
        )}

        <Link href="/" className="relative flex items-center gap-2 w-fit">
          <Sparkles size={18} className="text-white" aria-hidden="true" />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            Fab Memories Events
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
          className="relative space-y-8"
        >
          {variant === "client" ? (
            <>
              <h2 className="text-[2rem] font-bold tracking-tighter text-white leading-tight max-w-sm">
                Every moment,<br />perfectly planned.
              </h2>
              <div className="space-y-4">
                {CLIENT_HIGHLIGHTS.map((h) => (
                  <div key={h.text} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                      <h.icon size={15} className="text-white" aria-hidden="true" />
                    </div>
                    <p className="text-[13px] text-white/85 leading-relaxed pt-1.5">{h.text}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[1.7rem] font-bold tracking-tighter text-white leading-tight max-w-sm">
                Internal staff access
              </h2>
              <p className="text-[13px] text-white/60 leading-relaxed max-w-xs">
                This area is restricted to Fab Memories Events administrators,
                coordinators, and vendors. Accounts are created by an administrator —
                there is no public sign-up here.
              </p>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-4 max-w-xs">
                <ShieldCheck size={16} className="text-white/70 shrink-0" aria-hidden="true" />
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Every sign-in is recorded in the system audit trail.
                </p>
              </div>
            </>
          )}
        </motion.div>

        <p className="relative text-[11px] text-white/40">
          © {new Date().getFullYear()} Fab Memories Events
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
          className="w-full max-w-sm"
        >
          {/* Mobile logo — only shown when the left panel is hidden */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8 w-fit">
            <Sparkles size={17} className="text-primary" aria-hidden="true" />
            <span className="text-[14px] font-semibold tracking-tight gradient-text">
              Fab Memories Events
            </span>
          </Link>

          {eyebrow && (
            <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-primary mb-2">
              {eyebrow}
            </p>
          )}
          <h1 className="text-[24px] font-bold tracking-tighter text-text-main mb-1.5">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-text-muted mb-7">{subtitle}</p>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  )
}
