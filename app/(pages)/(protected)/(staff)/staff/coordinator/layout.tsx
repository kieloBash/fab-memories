import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

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