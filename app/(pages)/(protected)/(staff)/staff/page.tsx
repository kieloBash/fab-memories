import { getCurrentRole } from '@/lib/clerk/auth';
import { redirect } from 'next/navigation';

/**
 * Landing point after staff sign-in. Redirects to the correct
 * dashboard based on role, since /staff itself has no UI of its own.
 */
export default async function StaffIndexPage() {
    const role = await getCurrentRole();

    switch (role) {
        case 'ADMIN':
            redirect('/staff/admin');
        case 'COORDINATOR':
            redirect('/staff/coordinator');
        case 'VENDOR':
            redirect('/staff/vendor');
        default:
            redirect('/portal');
    }
}