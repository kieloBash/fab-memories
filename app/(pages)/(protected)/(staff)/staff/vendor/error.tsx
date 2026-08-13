'use client';

import Link from 'next/link';

export default function VendorError({ error }: { error: Error & { digest?: string } }) {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <h1 className="text-lg font-semibold text-red-600">Access denied</h1>
            <p className="text-sm text-slate-500">
                You don't have permission to view this page.
            </p>
            <Link href="/staff" className="text-sm text-slate-700 underline">
                Back to dashboard
            </Link>
        </div>
    );
}