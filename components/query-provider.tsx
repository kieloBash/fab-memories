'use client';

import { createQueryClient } from '@/lib/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    // useState ensures one QueryClient instance per browser session,
    // not recreated on every render, but still SSR-safe (not module-level).
    const [queryClient] = useState(() => createQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}