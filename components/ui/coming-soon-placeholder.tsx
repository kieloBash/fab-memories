// components/ui/coming-soon-placeholder.tsx

import type { LucideIcon } from "lucide-react"
import { Sparkles } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"

interface ComingSoonPlaceholderProps {
  title: string
  subtitle?: string
  icon: LucideIcon
  /** Module name as referenced in the thesis/TDD, e.g. "Module 5" */
  moduleLabel?: string
  /** Short description of what this page will eventually do */
  description: string
  /** Optional list of features planned for this module */
  plannedFeatures?: string[]
}

/**
 * Shown on any nav link that exists in the sidebar but whose page
 * hasn't been built yet. Replaces a dead 404 with an honest,
 * on-brand "here's what's coming" screen so navigation never
 * feels broken.
 */
export function ComingSoonPlaceholder({
  title,
  subtitle,
  icon,
  moduleLabel,
  description,
  plannedFeatures,
}: ComingSoonPlaceholderProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} subtitle={subtitle} icon={icon} />

      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border-strong bg-white py-16 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
          <Sparkles size={26} className="text-primary" aria-hidden="true" />
        </div>

        <div className="max-w-md space-y-1.5">
          {moduleLabel && (
            <span className="inline-block text-[10px] font-semibold tracking-[0.1em] uppercase text-primary bg-primary-soft px-2.5 py-1 rounded-pill mb-1">
              {moduleLabel} · In progress
            </span>
          )}
          <p className="text-[16px] font-semibold tracking-tight text-text-main">
            This page is coming soon
          </p>
          <p className="text-[13px] text-text-muted leading-relaxed">
            {description}
          </p>
        </div>

        {plannedFeatures && plannedFeatures.length > 0 && (
          <div className="w-full max-w-sm rounded-xl bg-background-blush p-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Planned for this page
            </p>
            <ul className="space-y-1.5">
              {plannedFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px] text-text-sub">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
