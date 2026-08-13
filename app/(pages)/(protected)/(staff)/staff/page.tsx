'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

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

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
    );
}