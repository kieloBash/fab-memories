// lib/axios.ts
//
// CHANGE: the SESSION_EXPIRED redirect is gone (custom session expiry removed — Clerk manages session lifetime).
// When Clerk ends a session (maximum lifetime / inactivity timeout / revoked), proxy.ts answers API calls with
// 401 { code: "NO_SESSION" }. Instead of every open screen showing error toasts, the browser is sent to its
// login page once, with ?error=SESSION_ENDED so the page explains why.

import axios from 'axios';
import { LOGIN_PATH, signInErrorUrl } from '@/lib/clerk/portal';

/**
 * Shared axios instance for all client-side API calls to our own
 * Next.js route handlers (/api/*). Keeps base config, headers, and
 * error normalization in one place instead of repeating fetch() setup
 * across every component.
 */
export const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Pages that must NOT be redirected on a 401: the sign-in flows themselves call /api/auth/portal-check before the
 * session is fully established, and handle NO_SESSION on their own (features/auth/finish-sign-in.ts).
 */
const SIGN_IN_FLOW_PATHS = [...Object.values(LOGIN_PATH), '/sign-up', '/forgot-password'];

let redirectingForEndedSession = false;

/**
 * Clerk ended the session → send the browser to its login page (staff screens → /staff-login, everything else →
 * /sign-in). Returns true when it redirected. Only once per page load, so parallel failing requests don't race.
 */
export function redirectIfSignedOut(
    error: unknown,
    location: Pick<Location, 'pathname' | 'assign'> | undefined = typeof window === 'undefined' ? undefined : window.location,
): boolean {
    if (!location || redirectingForEndedSession) return false;
    if (!axios.isAxiosError(error)) return false;
    if (error.response?.status !== 401 || error.response?.data?.code !== 'NO_SESSION') return false;
    if (SIGN_IN_FLOW_PATHS.some((p) => location.pathname.startsWith(p))) return false;

    redirectingForEndedSession = true;
    location.assign(signInErrorUrl(location.pathname.startsWith('/staff') ? 'staff' : 'client', 'SESSION_ENDED'));
    return true;
}

/** Test helper — resets the one-redirect guard. */
export function __resetSignedOutGuard() {
    redirectingForEndedSession = false;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        redirectIfSignedOut(error);
        return Promise.reject(error);
    },
);

/**
 * Normalizes axios errors into a plain message string, since route
 * handlers in this app return { error: string } on failure.
 */
export function getApiErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.error ?? error.message ?? 'Request failed';
    }
    if (error instanceof Error) return error.message;
    return 'Something went wrong';
}

export default api;