// app/(pages)/(protected)/(staff)/staff/admin/layout.tsx

import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout just enforces
 * that only ADMIN users can access any route under /staff/admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (role !== 'ADMIN') {
    redirect('/staff');
  }

  return <>{children}</>;
}
