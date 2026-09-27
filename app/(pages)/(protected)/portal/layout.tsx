// app/(pages)/(protected)/portal/layout.tsx

import SidebarShell from "@/features/layouts/components/SidebarShell";
import { dashboardFor, LOGIN_PATH } from "@/lib/clerk/portal";
import { getPageSession } from "@/lib/clerk/page-session";
import { redirect } from "next/navigation";

/**
 * Fixed nav items:
 * - "Home" now points to /portal (dashboard) with exact: true
 * - "My Bookings" correctly points to /portal/bookings
 * - Payments points to /portal/bookings/:id/payment (deep link handled
 *   at page level) — top-level nav stays at /portal/payments for overview
 *
 * FIX (login redirects): any non-CLIENT used to be sent to /staff — including users whose role was simply missing
 * from the session token, which /staff sent straight back here (redirect loop). Now: signed out → /sign-in,
 * unknown role → /unauthorized, staff role → that role's own dashboard.
 */
const navItems = [
  { href: "/portal",            label: "Home",        icon: "Home",         exact: true },
  { href: "/portal/bookings",   label: "My bookings", icon: "CalendarHeart" },
  { href: "/portal/payments",   label: "Payments",    icon: "CreditCard" },
  { href: "/portal/documents",  label: "Documents",   icon: "FileText" },
  { href: "/portal/account",    label: "Account",     icon: "UserCircle" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signedIn, role, dbUser: user } = await getPageSession();

  if (!signedIn) redirect(LOGIN_PATH.client);
  if (!role) redirect("/unauthorized");
  if (role !== "CLIENT") redirect(dashboardFor(role));

  const displayName = user?.fullName ?? user?.username ?? "Client";

  return (
    <SidebarShell
      navItems={navItems}
      userName={displayName}
      userRole="Client"
      notificationCount={0}
      signOutRedirectUrl={LOGIN_PATH.client}
    >
      {children}
    </SidebarShell>
  );
}
