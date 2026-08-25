// app/(pages)/(protected)/(client)/portal/layout.tsx

import SidebarShell from '@/features/layouts/components/SidebarShell';
import { getCurrentDbUser, getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

const navItems = [
  { href: '/portal', label: 'My booking', icon: "CalendarHeart" },
  { href: '/portal/payments', label: 'Payments', icon: "CreditCard" },
  { href: '/portal/documents', label: 'Documents', icon: "FileText" },
  { href: '/portal/account', label: 'Account', icon: "UserCircle" },
];

/**
 * Guards everything under /portal — confirms the signed-in user's
 * role is CLIENT. Middleware already redirects non-clients before
 * this runs; this is defense-in-depth.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  const user = await getCurrentDbUser();

  if (role !== 'CLIENT') {
    redirect('/staff');
  }

  // Prefer fullName → username → fallback
  const displayName = user?.fullName ?? user?.username ?? 'Client';

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
