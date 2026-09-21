// proxy.ts  (project root — Next 16 name for middleware)

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { Role } from "@/app/generated/prisma/client"
import { cspOptions } from "@/lib/security/headers"

// ── Route matchers ────────────────────────────────────────────────────────────

/** Routes that require any authenticated session */
const isProtected = createRouteMatcher([
    "/staff(.*)",
    "/portal(.*)",
])

/** Routes accessible only by staff (ADMIN, COORDINATOR, VENDOR) */
const isStaffRoute = createRouteMatcher(["/staff(.*)"])

/** Routes accessible only by clients */
const isClientRoute = createRouteMatcher(["/portal(.*)"])

/** Every API route. Signed-out callers are refused here, before any route code runs (deny by default). */
const isApi = createRouteMatcher(["/api(.*)"])

/** Public routes — never redirect these */
const isPublic = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/staff-login(.*)",
    "/api/webhooks(.*)",
    "/vendor-brief(.*)",
    "/api/vendor-brief(.*)",
    "/api/public(.*)",
])

// ── Middleware ────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req) => {
    // Always allow public routes through without any checks
    if (isPublic(req)) return NextResponse.next()

    // DENY BY DEFAULT for the API: a signed-out caller never reaches a route handler, so a route that forgets its own
    // guard is still not open to the internet. (Each route still checks the ROLE itself — this is the outer wall.)
    if (isApi(req)) {
        const { userId } = await auth()
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        return NextResponse.next()
    }

    // For protected routes, enforce authentication first
    if (isProtected(req)) {
        const { userId, sessionClaims } = await auth()
        const role = (sessionClaims as any)?.metadata?.role as Role | undefined

        // Not signed in — redirect to the appropriate login page
        if (!userId) {
            const loginUrl = isStaffRoute(req)
                ? new URL("/staff-login", req.url)
                : new URL("/sign-in", req.url)
            return NextResponse.redirect(loginUrl)
        }

        // Signed in but wrong role for this section
        if (isStaffRoute(req) && role === "CLIENT") {
            return NextResponse.redirect(new URL("/portal", req.url))
        }

        if (isClientRoute(req) && role && role !== "CLIENT") {
            return NextResponse.redirect(new URL("/staff", req.url))
        }
    }

    return NextResponse.next()
}, {
    // Content-Security-Policy with a per-request nonce (see lib/security/headers.ts). Report-only until CSP_ENFORCE=true.
    contentSecurityPolicy: cspOptions,
})

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
