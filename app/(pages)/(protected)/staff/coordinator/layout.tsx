// app/(pages)/(protected)/(staff)/staff/coordinator/layout.tsx

import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout enforces that
 * only ADMIN and COORDINATOR users can access /staff/coordinator routes.
 */
export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (!role || !['ADMIN', 'COORDINATOR'].includes(role)) {
    redirect('/staff');
  }

  return <>{children}</>;
}
