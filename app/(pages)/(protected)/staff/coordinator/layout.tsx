// app/(pages)/(protected)/staff/coordinator/layout.tsx

import { getPageSession } from '@/lib/clerk/page-session';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout enforces that
 * only ADMIN and COORDINATOR users can access /staff/coordinator routes.
 *
 * FIX: redirects to /unauthorized instead of silently bouncing to /staff.
 */
export default async function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getPageSession();
  if (!role || !['ADMIN', 'COORDINATOR'].includes(role)) {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
