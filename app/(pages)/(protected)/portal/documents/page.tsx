// app/(pages)/(protected)/portal/documents/page.tsx
//
// SCOPE: document generation (contracts, invoices, receipts, checklists) is OUT OF SCOPE for this version —
// it is listed in the thesis delimitations and deferred to a future build. The menu entry was removed; this
// route stays only so an old bookmark or a typed URL lands somewhere sensible instead of a 404.

import { redirect } from "next/navigation"

export default function ClientDocumentsPage() {
  redirect("/portal")
}
