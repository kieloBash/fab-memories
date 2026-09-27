// app/(pages)/(protected)/staff/page.tsx

import { redirect } from "next/navigation";
import { dashboardFor } from "@/lib/clerk/portal";
import { getPageSession } from "@/lib/clerk/page-session";

/**
 * /staff has no content of its own — it forwards to the signed-in role's dashboard.
 *
 * FIX: this used to be a client component that waited for Clerk to load and sent any unknown role to /portal
 * (which bounced back here). It now redirects on the server with the same resolved role as staff/layout.tsx,
 * which has already turned away signed-out, unknown-role and CLIENT visitors.
 */
export default async function StaffIndexPage() {
  const { role } = await getPageSession();
  redirect(role ? dashboardFor(role) : "/unauthorized");
}
