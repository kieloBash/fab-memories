import axios from 'axios';

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