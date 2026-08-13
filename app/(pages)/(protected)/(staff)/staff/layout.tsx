import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Guards everything under /staff — confirms the signed-in user's role
 * is one of ADMIN, COORDINATOR, VENDOR. Middleware already redirects
 * CLIENT users away; this is defense-in-depth for the same reason as
 * portal/layout.tsx.
 */
export default async function StaffLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const role = await getCurrentRole();
    if (!role || role === 'CLIENT') {
        redirect('/portal');
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="border-b bg-slate-900 px-6 py-4">
                <span className="font-semibold text-white">
                    Fab Memories Events — Staff Console
                </span>
            </header>
            <main className="p-6">{children}</main>
        </div>
    );
}