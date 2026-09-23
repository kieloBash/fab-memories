// test-harness/integration/_support/http.ts
//
// Calls a Next.js route handler exactly the way the framework does — a real Request plus a
// `{ params: Promise<…> }` context — and returns the parsed response.
//
//   const r = await call(POST, { body: {...} })
//   const r = await call(PATCH, { params: { bookingId }, body: { status: "CONFIRMED" } })
//   const r = await call(GET, { query: { status: "PENDING" } })
//   expect(r.status).toBe(200); r.json.id …
type AnyHandler = (req: Request, ctx: { params: Promise<any> }) => Response | Promise<Response>

export interface CallOptions {
  method?: string
  path?: string
  params?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
}

export interface CallResult<T = any> {
  status: number
  json: T
  text: string
  headers: Headers
}

export async function call<T = any>(handler: (...args: any[]) => any, opts: CallOptions = {}): Promise<CallResult<T>> {
  const url = new URL(`http://itest.local/api${opts.path ?? "/"}`)
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v))
  const hasBody = opts.body !== undefined
  const req = new Request(url, {
    method: opts.method ?? (hasBody ? "POST" : "GET"),
    headers: { "content-type": "application/json", ...(opts.headers ?? {}) },
    body: hasBody ? (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)) : undefined,
  })
  const res: Response = await (handler as AnyHandler)(req, { params: Promise.resolve(opts.params ?? {}) })
  const text = await res.text()
  let json: any = text
  try { json = text ? JSON.parse(text) : null } catch { /* CSV / plain text */ }
  return { status: res.status, json, text, headers: res.headers }
}

/** Fails with the response body in the message, which is what you want to see when a happy path breaks. */
export function expectStatus(r: CallResult, status: number) {
  if (r.status !== status) {
    throw new Error(`Expected HTTP ${status}, got ${r.status}: ${r.text.slice(0, 500)}`)
  }
}
