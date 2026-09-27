// lib/axios.ts

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
 * SESSION_MAX_AGE: proxy.ts answers API calls from an expired session with 401 { code: "SESSION_EXPIRED" }.
 * Instead of every open screen showing error toasts, send the browser to its login page (which ends the session).
 * Staff screens (/staff/...) go to /staff-login, everything else to /sign-in. Returns true when it redirected.
 */
let redirectingForExpiredSession = false

export function redirectIfSessionExpired(
    error: unknown,
    location: Pick<Location, 'pathname' | 'assign'> | undefined = typeof window === 'undefined' ? undefined : window.location,
): boolean {
    if (!location || redirectingForExpiredSession) return false;
    if (!axios.isAxiosError(error)) return false;
    if (error.response?.status !== 401 || error.response?.data?.code !== 'SESSION_EXPIRED') return false;
    // Already on a login page — that page handles the expiry itself.
    if (Object.values(LOGIN_PATH).some((p) => location.pathname.startsWith(p))) return false;

    redirectingForExpiredSession = true;
    location.assign(signInErrorUrl(location.pathname.startsWith('/staff') ? 'staff' : 'client', 'SESSION_EXPIRED'));
    return true;
}

/** Test helper — resets the one-redirect guard. */
export function __resetSessionExpiredGuard() {
    redirectingForExpiredSession = false;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        redirectIfSessionExpired(error);
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