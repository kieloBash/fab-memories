import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient config. Sensible defaults for an internal
 * admin/staff tool: don't refetch too aggressively, but don't cache
 * stale data (e.g. staff lists, booking statuses) too long either.
 */
export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000, // 30s — avoid refetch spam on quick nav
                gcTime: 5 * 60 * 1000, // 5min
                refetchOnWindowFocus: false,
                retry: 1,
            },
            mutations: {
                retry: 0,
            },
        },
    });
}