// app/(pages)/(protected)/staff/admin/layout.tsx

import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout just enforces
 * that only ADMIN users can access any route under /staff/admin.
 *
 * FIX: previously redirected to `/staff`, which for a COORDINATOR
 * or VENDOR would just silently land them on their own dashboard
 * with no explanation of why they got bounced. Now routes through
 * the dedicated /unauthorized page so the "why" is explicit.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (role !== 'ADMIN') {
    redirect('/unauthorized');
  }

  return <>{children}</>;
}
