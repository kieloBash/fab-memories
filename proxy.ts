import type { AppSessionClaims } from '@/lib/clerk/types';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/staff-login(.*)',
    '/api/webhooks(.*)',
]);

const isPortalRoute = createRouteMatcher(['/portal(.*)']);
const isStaffRoute = createRouteMatcher(['/staff(.*)']);
const isAdminRoute = createRouteMatcher(['/staff/admin(.*)']);
const isCoordinatorRoute = createRouteMatcher(['/staff/coordinator(.*)']);
const isVendorRoute = createRouteMatcher(['/staff/vendor(.*)']);

export default clerkMiddleware(async (authFn, req) => {
    if (isPublicRoute(req)) {
        return NextResponse.next();
    }

    const { userId, sessionClaims, redirectToSignIn } = await authFn();

    if (!userId) {
        return redirectToSignIn();
    }

    const role = (sessionClaims as AppSessionClaims | null)?.metadata?.role;

    // Cross-area redirects
    if (isPortalRoute(req) && role !== 'CLIENT') {
        return NextResponse.redirect(new URL('/staff', req.url));
    }
    if (isStaffRoute(req) && role === 'CLIENT') {
        return NextResponse.redirect(new URL('/portal', req.url));
    }

    // Sub-area redirects within /staff
    if (isAdminRoute(req) && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/staff', req.url));
    }
    if (isCoordinatorRoute(req) && !['ADMIN', 'COORDINATOR'].includes(role ?? '')) {
        return NextResponse.redirect(new URL('/staff', req.url));
    }
    if (isVendorRoute(req) && !['ADMIN', 'VENDOR'].includes(role ?? '')) {
        return NextResponse.redirect(new URL('/staff', req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};