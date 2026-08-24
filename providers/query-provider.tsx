// providers/query-provider.tsx
"use client"

import { createQueryClient } from "@/lib/query-client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures one QueryClient instance per browser session —
  // not recreated on every render, but still SSR-safe (not module-level).
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
