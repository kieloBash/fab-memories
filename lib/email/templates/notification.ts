// lib/email/templates/notification.ts
//
// Generic email for anything sent through notify() (lib/notifications/notify.ts): a heading, a short
// message and an optional button to the related page. Used when no dedicated template exists.

import { button, esc, layout } from "./layout"

export function notificationEmail(d: { title: string; body: string; link?: string | null }) {
  const html = layout({
    heading: d.title,
    preheader: d.body.slice(0, 120),
    bodyHtml: `
      <p style="margin:0 0 16px;">${esc(d.body)}</p>
      ${d.link && d.link.startsWith("/") ? button("Open in Fab Memories", d.link) : ""}`,
  })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://fab-memories.vercel.app"
  const text = [d.body, ...(d.link && d.link.startsWith("/") ? ["", `${appUrl}${d.link}`] : []), "", "— Fab Memories Events"].join("\n")
  return { subject: `${d.title} — Fab Memories Events`, html, text }
}

/** A test email the administrator can send from /api/admin/email/test to check delivery. */
export function testEmail(d: { requestedBy: string; mode: string; sentAt: Date }) {
  const html = layout({
    heading: "Email delivery test ✉️",
    preheader: "If you can read this, Fab Memories Events can send email.",
    bodyHtml: `
      <p style="margin:0 0 12px;">If you can read this, the Fab Memories Events system can send email.</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">Requested by ${esc(d.requestedBy)} · transport ${esc(d.mode)} · ${esc(d.sentAt.toISOString())}</p>`,
  })
  const text = `If you can read this, the Fab Memories Events system can send email.\nRequested by ${d.requestedBy} · transport ${d.mode} · ${d.sentAt.toISOString()}`
  return { subject: "Email delivery test — Fab Memories Events", html, text }
}
