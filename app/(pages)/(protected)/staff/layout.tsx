// app/(pages)/(protected)/(staff)/staff/layout.tsx

import SidebarShell from '@/features/layouts/components/SidebarShell';
import { getCurrentDbUser, getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Nav items are scoped per-role inside the child layouts (admin/coordinator/vendor).
 * This root shell provides the widest superset so the shell always renders.
 * Each role only ever reaches the routes allowed by their child layout's redirect guard.
 *
 * Role → redirect target (from staff/page.tsx):
 *   ADMIN       → /staff/admin
 *   COORDINATOR → /staff/coordinator
 *   VENDOR      → /staff/vendor
 */
const adminNavItems = [
  { href: '/staff/admin', label: 'Dashboard', icon: "LayoutDashboard" },
  { href: '/staff/admin/bookings', label: 'Bookings', icon: "CalendarDays" },
  { href: '/staff/admin/packages', label: 'Packages', icon: "Package" },
  { href: '/staff/admin/payments', label: 'Payments', icon: "CreditCard" },
  { href: '/staff/admin/vendors', label: 'Vendors', icon: "Store" },
  { href: '/staff/admin/staff', label: 'Staff scheduling', icon: "Users" },
  { href: '/staff/admin/documents', label: 'Documents', icon: "FileText" },
  { href: '/staff/admin/audit', label: 'Audit trail', icon: "ShieldCheck" },
  { href: '/staff/admin/reports', label: 'Reports', icon: "BarChart3" },
  { href: '/staff/admin/users', label: 'User accounts', icon: "Users" },
];

const coordinatorNavItems = [
  { href: '/staff/coordinator', label: 'Dashboard', icon: "LayoutDashboard" },
  { href: '/staff/coordinator/bookings', label: 'Bookings', icon: "CalendarDays" },
  { href: '/staff/coordinator/calendar', label: 'Event calendar', icon: "CalendarRange" },
  { href: '/staff/coordinator/payments', label: 'Payments', icon: "CreditCard" },
  { href: '/staff/coordinator/vendors', label: 'Vendors', icon: "Store" },
  { href: '/staff/coordinator/staff', label: 'Staff scheduling', icon: "Users" },
  { href: '/staff/coordinator/documents', label: 'Documents', icon: "FileText" },
];

const vendorNavItems = [
  { href: '/staff/vendor', label: 'My assignments', icon: "ClipboardList" },
  { href: '/staff/vendor/quotations', label: 'Quotations', icon: "FileText" },
  { href: '/staff/vendor/history', label: 'History', icon: "CalendarRange" },
];

function getNavItems(role: string) {
  if (role === 'ADMIN') return adminNavItems;
  if (role === 'COORDINATOR') return coordinatorNavItems;
  if (role === 'VENDOR') return vendorNavItems;
  return [];
}

function getRoleLabel(role: string) {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'COORDINATOR') return 'Event Coordinator';
  if (role === 'VENDOR') return 'Vendor';
  return role;
}

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  const user = await getCurrentDbUser();

  if (!role || role === 'CLIENT') {
    redirect('/portal');
  }

  const navItems = getNavItems(role);
  const displayName = user?.fullName ?? user?.username ?? 'Staff';
  const roleLabel = getRoleLabel(role);

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
