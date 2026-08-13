'use client';

import Link from 'next/link';

export default function StaffError({ error }: { error: Error & { digest?: string } }) {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <h1 className="text-lg font-semibold text-red-600">Something went wrong</h1>
            <p className="text-sm text-slate-500">{error.message || 'Please try again.'}</p>
            <Link href="/staff" className="text-sm text-slate-700 underline">
                Back to dashboard
            </Link>
        </div>
    );
}