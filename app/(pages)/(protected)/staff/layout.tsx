// app/(pages)/(protected)/staff/layout.tsx

import SidebarShell from "@/features/layouts/components/SidebarShell";
import { getCurrentDbUser, getCurrentRole } from "@/lib/clerk/auth";
import { redirect } from "next/navigation";

/**
 * Key fix: Dashboard routes use `exact: true` to prevent them from
 * matching every child route via startsWith. E.g. /staff/admin would
 * previously activate when on /staff/admin/bookings.
 *
 * User accounts now uses "UserCog" icon (distinct from "Users").
 */
const adminNavItems = [
  { href: "/staff/admin",           label: "Dashboard",       icon: "LayoutDashboard", exact: true },
  { href: "/staff/admin/bookings",  label: "Bookings",        icon: "CalendarDays" },
  { href: "/staff/admin/payments",  label: "Payments",        icon: "CreditCard" },
  { href: "/staff/admin/packages",  label: "Packages",        icon: "Package" },
  { href: "/staff/admin/vendors",   label: "Vendors",         icon: "Store" },
  { href: "/staff/admin/staff",     label: "Staff scheduling", icon: "Users" },
  { href: "/staff/admin/documents", label: "Documents",       icon: "FileText" },
  { href: "/staff/admin/audit",     label: "Audit trail",     icon: "ShieldCheck" },
  { href: "/staff/admin/reports",   label: "Reports",         icon: "BarChart3" },
  { href: "/staff/admin/users",     label: "User accounts",   icon: "UserCog" },
];

const coordinatorNavItems = [
  { href: "/staff/coordinator",           label: "Dashboard",       icon: "LayoutDashboard", exact: true },
  { href: "/staff/coordinator/bookings",  label: "Bookings",        icon: "CalendarDays" },
  { href: "/staff/coordinator/calendar",  label: "Event calendar",  icon: "CalendarRange" },
  { href: "/staff/coordinator/payments",  label: "Payments",        icon: "CreditCard" },
  { href: "/staff/coordinator/vendors",   label: "Vendors",         icon: "Store" },
  { href: "/staff/coordinator/staff",     label: "Staff scheduling", icon: "Users" },
  { href: "/staff/coordinator/documents", label: "Documents",       icon: "FileText" },
];

const vendorNavItems = [
  { href: "/staff/vendor",             label: "My assignments", icon: "ClipboardList", exact: true },
  { href: "/staff/vendor/quotations",  label: "Quotations",    icon: "FileText" },
  { href: "/staff/vendor/history",     label: "History",       icon: "CalendarRange" },
];

function getNavItems(role: string) {
  if (role === "ADMIN")       return adminNavItems;
  if (role === "COORDINATOR") return coordinatorNavItems;
  if (role === "VENDOR")      return vendorNavItems;
  return [];
}

function getRoleLabel(role: string) {
  if (role === "ADMIN")       return "Administrator";
  if (role === "COORDINATOR") return "Event Coordinator";
  if (role === "VENDOR")      return "Vendor";
  return role;
}

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  const user = await getCurrentDbUser();

  if (!role || role === "CLIENT") {
    redirect("/portal");
  }

  const navItems   = getNavItems(role);
  const displayName = user?.fullName ?? user?.username ?? "Staff";
  const roleLabel   = getRoleLabel(role);

  return (
    <SidebarShell
      navItems={navItems}
      userName={displayName}
      userRole={roleLabel}
      notificationCount={0}
    >
      {children}
    </SidebarShell>
  );
}
