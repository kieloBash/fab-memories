// lib/email/templates/layout.ts
//
// Shared HTML frame for every Fab Memories email — same technique as the LiveAdmin daily summary:
// inline styles and tables only, so it renders the same in Gmail, Outlook and phone mail apps.
//
// SECURITY: every value that comes from users (names, venues, notes) must pass through esc() before it is
// placed in the HTML. Use the helpers below — they escape for you.

export const BRAND = {
  primary: "#F564A9",
  primaryDeep: "#C850C0",
  primarySoft: "#fce8f3",
  text: "#111827",
  sub: "#6b7280",
  border: "#e5e7eb",
  bg: "#f9fafb",
} as const

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://fab-memories.vercel.app").replace(/\/$/, "")

/** Escape text for safe use inside HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Absolute link inside the app (paths only — never a user-supplied URL). */
export const appLink = (path: string) => `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`

export const peso = (n: number | string) =>
  "₱" + new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))

export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" })

const METHOD_LABELS: Record<string, string> = {
  GCASH: "GCash", MAYA: "Maya", BANK_TRANSFER: "Bank Transfer", CHEQUE: "Cheque", CASH: "Cash",
}
/** Payment-method display name (GCASH → GCash). */
export const methodLabel = (m: string) => METHOD_LABELS[m] ?? titleCase(m)

export const titleCase = (s: string) =>
  s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

/** One label/value row for a details table. Both parts are escaped. */
export function detailRow(label: string, value: unknown) {
  return `
      <tr>
        <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;color:${BRAND.sub};font-size:13px;width:40%;">${esc(label)}</td>
        <td style="padding:8px 16px;border-bottom:1px solid #f3f4f6;color:${BRAND.text};font-size:14px;font-weight:600;">${esc(value)}</td>
      </tr>`
}

export function detailsTable(rows: [string, unknown][]) {
  return `
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0 20px;border:1px solid ${BRAND.border};border-radius:6px;">
      ${rows.map(([l, v]) => detailRow(l, v)).join("")}
    </table>`
}

export function button(label: string, path: string) {
  return `
    <table role="presentation" style="margin:8px 0 4px;"><tr><td style="border-radius:999px;background:${BRAND.primary};">
      <a href="${esc(appLink(path))}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:999px;">${esc(label)}</a>
    </td></tr></table>`
}

export function callout(html: string, tone: "info" | "warn" = "info") {
  const [bg, border, color] = tone === "warn" ? ["#fff7ed", "#fed7aa", "#9a3412"] : [BRAND.primarySoft, "#f9c6e0", "#9d174d"]
  return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;color:${color};font-size:14px;margin:0 0 16px;">${html}</div>`
}

/**
 * Wraps content in the Fab Memories frame. `heading` and `preheader` are escaped; `bodyHtml` must already be
 * built from the escaping helpers above.
 */
export function layout(opts: { heading: string; preheader: string; bodyHtml: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${esc(opts.preheader)}</span>
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDeep});background-color:${BRAND.primary};color:#fff;padding:20px 24px;border-radius:10px 10px 0 0;">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Fab Memories Events</div>
      <h1 style="margin:6px 0 0;font-size:20px;line-height:1.3;">${esc(opts.heading)}</h1>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 10px 10px;color:${BRAND.text};font-size:14px;line-height:1.6;">
      ${opts.bodyHtml}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
      This is an automated message from Fab Memories Events · ${new Date().getFullYear()}<br>
      Please do not reply to this email.
    </p>
  </div>
</body></html>`
}

/** Standard greeting line using the first name. */
export const hello = (fullName: string | null | undefined) =>
  `<p style="margin:0 0 12px;">Hi ${esc(fullName?.trim().split(/\s+/)[0] || "there")},</p>`
