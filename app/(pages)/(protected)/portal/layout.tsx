// app/(pages)/(protected)/portal/layout.tsx

import SidebarShell from "@/features/layouts/components/SidebarShell";
import { getCurrentDbUser, getCurrentRole } from "@/lib/clerk/auth";
import { redirect } from "next/navigation";

/**
 * Fixed nav items:
 * - "Home" now points to /portal (dashboard) with exact: true
 * - "My Bookings" correctly points to /portal/bookings
 * - Payments points to /portal/bookings/:id/payment (deep link handled
 *   at page level) — top-level nav stays at /portal/payments for overview
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
  const role = await getCurrentRole();
  const user = await getCurrentDbUser();

  if (role !== "CLIENT") {
    redirect("/staff");
  }

  const displayName = user?.fullName ?? user?.username ?? "Client";

  return (
    <SidebarShell
      navItems={navItems}
      userName={displayName}
      userRole="Client"
      notificationCount={0}
    >
      {children}
    </SidebarShell>
  );
}
