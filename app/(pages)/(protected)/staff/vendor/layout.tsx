// app/(pages)/(protected)/(staff)/staff/vendor/layout.tsx

import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout enforces that
 * only ADMIN and VENDOR users can access /staff/vendor routes.
 */
export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();
  if (!role || !['ADMIN', 'VENDOR'].includes(role)) {
    redirect('/staff');
  }

  return <>{children}</>;
}
