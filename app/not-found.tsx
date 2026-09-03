// app/not-found.tsx

import Link from "next/link"
import { Compass, Home } from "lucide-react"

/**
 * Global 404. Next.js renders this automatically for any unmatched
 * route in the app router — no wiring needed beyond this file existing
 * at app/not-found.tsx.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-background-blush flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-primary-soft flex items-center justify-center">
            <Compass size={36} className="text-primary" aria-hidden="true" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-border text-[12px] font-bold text-primary shadow-primary-sm">
            ?
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold tracking-widest uppercase text-primary">
            404
          </p>
          <h1 className="text-[26px] font-bold tracking-tighter text-text-main">
            This page wandered off
          </h1>
          <p className="text-[13px] text-text-muted leading-relaxed">
            The page you're looking for doesn't exist, moved, or the link may be
            outdated. Let's get you back on track.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-pill px-5 h-10 text-[14px] font-medium text-white shadow-primary-sm hover:opacity-90 hover:shadow-primary-md transition-all"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
        >
          <Home size={15} aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
