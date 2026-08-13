import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

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