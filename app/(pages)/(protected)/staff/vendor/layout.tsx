// app/(pages)/(protected)/staff/vendor/layout.tsx

import { getPageSession } from '@/lib/clerk/page-session';
import { redirect } from 'next/navigation';

/**
 * Role guard only — the visual shell is handled by the parent
 * staff/layout.tsx via SidebarShell. This layout enforces that
 * only ADMIN and VENDOR users can access /staff/vendor routes.
 *
 * FIX: redirects to /unauthorized instead of silently bouncing to /staff.
 */
export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No vendor portal in this version (see Delimitations): vendors receive a read-only event brief link
  // instead of an account, so these pages are closed to everyone.
  await getPageSession();
  redirect('/unauthorized');

  return <>{children}</>;
}
