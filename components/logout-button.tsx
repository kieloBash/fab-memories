'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
    /** Where to send the user after sign-out. Defaults to the landing page. */
    redirectUrl?: string;
    className?: string;
    children?: React.ReactNode;
}

/**
 * Signs the current user out via Clerk and redirects them.
 * Works for both client and staff sessions — Clerk's signOut()
 * clears whichever session is active regardless of role.
 */
export function LogoutButton({
    redirectUrl = '/',
    className,
    children,
}: LogoutButtonProps) {
    const { signOut } = useClerk();
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleLogout() {
        setIsSigningOut(true);
        try {
            await signOut();
            router.push(redirectUrl);
            router.refresh();
        } catch (err) {
            console.error('Sign-out failed:', err);
            setIsSigningOut(false);
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className={
                className ??
                'rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50'
            }
        >
            {children ?? (isSigningOut ? 'Signing out...' : 'Sign out')}
        </button>
    );
}