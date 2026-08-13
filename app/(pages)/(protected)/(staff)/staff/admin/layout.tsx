import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

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