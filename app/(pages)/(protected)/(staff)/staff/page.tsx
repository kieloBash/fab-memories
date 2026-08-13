// app/staff/page.tsx — client-side fallback version if force-dynamic alone doesn't fix it
'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StaffIndexPage() {
    const { isLoaded, sessionClaims } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoaded) return;
        const role = (sessionClaims as any)?.metadata?.role;

        if (role === 'ADMIN') router.replace('/staff/admin');
        else if (role === 'COORDINATOR') router.replace('/staff/coordinator');
        else if (role === 'VENDOR') router.replace('/staff/vendor');
        else router.replace('/portal');
    }, [isLoaded, sessionClaims, router]);

    return <p className="p-6 text-sm text-slate-500">Redirecting...</p>;
}