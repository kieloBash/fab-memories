import { LogoutButton } from '@/components/logout-button';
import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Guards everything under /portal — confirms the signed-in user's
 * role is CLIENT. Middleware already redirects non-clients before
 * this ever runs; this is a defense-in-depth check for anything that
 * bypasses middleware (e.g. server actions called from elsewhere).
 */
export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const role = await getCurrentRole();
    if (role !== 'CLIENT') {
        redirect('/staff');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="border-b bg-white px-6 py-4">
                <span className="font-semibold text-gray-800">Fab Memories Events — Client Portal</span>
                <LogoutButton
                    redirectUrl="/"
                    className="rounded border border-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                />
            </header>
            <main className="p-6">{children}</main>
        </div>
    );
}