// app/(pages)/(protected)/unauthorized/page.tsx

import Link from "next/link"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { getCurrentDbUser, getCurrentRole } from "@/lib/clerk/auth"
import { getDefaultRedirect } from "@/lib/rbac"

/**
 * Shown when a signed-in user's role doesn't permit the route they
 * tried to visit (e.g. a COORDINATOR hitting /staff/admin/*).
 * The user IS authenticated at this point — this is a role/permission
 * mismatch, not a login requirement, so it's distinct from Clerk's
 * own sign-in redirect flow.
 */
export default async function UnauthorizedPage() {
  const role = await getCurrentRole()
  const user = await getCurrentDbUser()

  const homeHref = role ? getDefaultRedirect(role) : "/"
  const displayName = user?.fullName ?? "there"

  return (
    <div className="min-h-screen bg-background-blush flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
          <ShieldAlert size={36} className="text-red-500" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-[13px] font-semibold tracking-widest uppercase text-red-500">
            403 · Access restricted
          </p>
          <h1 className="text-[26px] font-bold tracking-tighter text-text-main">
            You don't have access to this page
          </h1>
          <p className="text-[13px] text-text-muted leading-relaxed">
            Hi {displayName} — your account role doesn't include permission to view
            this section. If you believe this is a mistake, contact your administrator.
          </p>
        </div>

        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-pill px-5 h-10 text-[14px] font-medium text-white shadow-primary-sm hover:opacity-90 hover:shadow-primary-md transition-all"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)" }}
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back to your dashboard
        </Link>
      </div>
    </div>
  )
}
