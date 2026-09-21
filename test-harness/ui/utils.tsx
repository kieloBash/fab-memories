// test-harness/ui/utils.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactElement } from "react"
import { vi } from "vitest"

export const mockApi = { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn(), put: vi.fn() }
export const routerMock = { push: vi.fn(), replace: vi.fn(), back: vi.fn() }
export const toastMock = { success: vi.fn(), error: vi.fn() }

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } })
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) }
}

/** Routes api.get calls to fixtures by URL suffix. Unknown URLs fail loudly. */
export function routeGet(routes: Record<string, unknown | ((cfg: any) => unknown)>) {
  mockApi.get.mockImplementation(async (url: string, cfg?: any) => {
    const key = Object.keys(routes).find((k) => url === k || url.endsWith(k))
    if (!key) throw new Error(`Unmocked GET ${url}`)
    const v = routes[key]
    return { data: typeof v === "function" ? (v as any)(cfg) : v, headers: {} }
  })
}
