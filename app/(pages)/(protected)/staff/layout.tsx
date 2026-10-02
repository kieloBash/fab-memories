// app/(pages)/(protected)/staff/layout.tsx

import SidebarShell from "@/features/layouts/components/SidebarShell";
import { dashboardFor, LOGIN_PATH } from "@/lib/clerk/portal";
import { getPageSession } from "@/lib/clerk/page-session";
import { redirect } from "next/navigation";

/**
 * Key fix: Dashboard routes use `exact: true` to prevent them from
 * matching every child route via startsWith. E.g. /staff/admin would
 * previously activate when on /staff/admin/bookings.
 *
 * User accounts now uses "UserCog" icon (distinct from "Users").
 *
 * SCOPE: "Documents" removed from the admin and coordinator menus — document generation is out of scope
 * (thesis delimitation). The /staff/admin/documents and /staff/coordinator/documents pages now redirect.
 *
 * FIX (login redirects): a user with no role in the session token used to be sent to /portal, which sent them
 * straight back here — a redirect loop. The role now falls back to the database (lib/clerk/page-session.ts);
 * signed-out visitors go to /staff-login; a truly unknown role goes to /unauthorized.
 */
const adminNavItems = [
  { href: "/staff/admin", label: "Dashboard", icon: "LayoutDashboard", exact: true },
  { href: "/staff/admin/bookings", label: "Bookings", icon: "CalendarDays" },
  { href: "/staff/admin/payments", label: "Payments", icon: "CreditCard" },
  { href: "/staff/admin/packages", label: "Packages", icon: "Package" },
  { href: "/staff/admin/vendors", label: "Vendors", icon: "Store" },
  { href: "/staff/admin/staff", label: "Staff scheduling", icon: "Users" },
  { href: "/staff/admin/audit", label: "Audit trail", icon: "ShieldCheck" },
  { href: "/staff/admin/reports", label: "Reports", icon: "BarChart3" },
  { href: "/staff/admin/users", label: "User accounts", icon: "UserCog" },
];

const coordinatorNavItems = [
  { href: "/staff/coordinator", label: "Dashboard", icon: "LayoutDashboard", exact: true },
  { href: "/staff/coordinator/bookings",  label: "Bookings",        icon: "CalendarDays" },
  { href: "/staff/coordinator/calendar", label: "Event calendar", icon: "CalendarRange" },
  { href: "/staff/coordinator/payments", label: "Payments", icon: "CreditCard" },
  // { href: "/staff/coordinator/vendors", label: "Vendors", icon: "Store" },
  { href: "/staff/coordinator/staff", label: "Staff scheduling", icon: "Users" },
  { href: "/staff/coordinator/availability", label: "My availability", icon: "CalendarOff" },
  { href: "/staff/coordinator/reports", label: "Reports", icon: "BarChart3" },
];

const vendorNavItems = [
  { href: "/staff/vendor", label: "My assignments", icon: "ClipboardList", exact: true },
  { href: "/staff/vendor/quotations", label: "Quotations", icon: "FileText" },
  { href: "/staff/vendor/history", label: "History", icon: "CalendarRange" },
];

function getNavItems(role: string) {
  if (role === "ADMIN") return adminNavItems;
  if (role === "COORDINATOR") return coordinatorNavItems;
  if (role === "VENDOR") return vendorNavItems;
  return [];
}

function getRoleLabel(role: string) {
  if (role === "ADMIN") return "Administrator";
  if (role === "COORDINATOR") return "Event Coordinator";
  if (role === "VENDOR") return "Vendor";
  return role;
}

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signedIn, role, dbUser: user } = await getPageSession();

  if (!signedIn) redirect(LOGIN_PATH.staff);
  if (!role) redirect("/unauthorized");
  if (role === "CLIENT") redirect(dashboardFor(role));

  const navItems = getNavItems(role);
  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const roleLabel = getRoleLabel(role);

  return (
    <SidebarShell
      navItems={navItems}
      userName={displayName}
      userRole={roleLabel}
      notificationCount={0}
      signOutRedirectUrl={LOGIN_PATH.staff}
    >
      {children}
    </SidebarShell>
  );
}
