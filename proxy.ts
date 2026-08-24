// middleware.ts  (project root)

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { Role } from "@/app/generated/prisma/client"

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

/** Public routes — never redirect these */
const isPublic = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/staff-login(.*)",
    "/api/webhooks(.*)",
])

// ── Middleware ────────────────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req) => {
    // Always allow public routes through without any checks
    if (isPublic(req)) return NextResponse.next()

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
})

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
}
