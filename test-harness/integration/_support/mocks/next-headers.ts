// test-harness/integration/_support/mocks/next-headers.ts — stands in for next/headers
// A test sets the request headers with setRequestHeaders() before calling a route that reads headers().
export function setRequestHeaders(h: Record<string, string>) {
  ;(globalThis as any).__itestHeaders = new Headers(h)
}

export async function headers() {
  return ((globalThis as any).__itestHeaders as Headers | undefined) ?? new Headers()
}

export async function cookies() {
  return { get: () => undefined, getAll: () => [], has: () => false }
}
