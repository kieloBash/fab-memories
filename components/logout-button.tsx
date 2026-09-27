// components/logout-button.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

interface LogoutButtonProps {
    /** Where to send the user after sign-out. Defaults to the landing page; the sidebars pass their own login page. */
    redirectUrl?: string;
    className?: string;
    children?: React.ReactNode;
    /**
     * "full"     — icon + label, ghost button (default; used in expanded sidebar footer)
     * "icon"     — icon only, square button (used in collapsed sidebar footer)
     */
    variant?: 'full' | 'icon';
}

/**
 * Signs the current user out via Clerk and redirects them.
 * Works for both client and staff sessions — Clerk's signOut()
 * clears whichever session is active regardless of role.
 *
 * Uses the app's own Button component so it always matches the
 * brand — no more foreign slate-gray styling that stood out from
 * the rest of the sidebar.
 */
export function LogoutButton({
    redirectUrl = '/',
    className,
    children,
    variant = 'full',
}: LogoutButtonProps) {
    const { signOut } = useClerk();
    const [isSigningOut, setIsSigningOut] = useState(false);

    async function handleLogout() {
        setIsSigningOut(true);
        try {
            // Let Clerk navigate once the session is cleared — pushing the route ourselves raced the sign-out and
            // could land on a protected page with a stale session.
            await signOut({ redirectUrl });
        } catch (err) {
            console.error('Sign-out failed:', err);
            setIsSigningOut(false);
        }
    }

    if (variant === 'icon') {
        return (
            <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleLogout}
                disabled={isSigningOut}
                aria-label={isSigningOut ? 'Signing out…' : 'Sign out'}
                title="Sign out"
                className={cn('text-text-muted hover:text-red-500 hover:bg-red-50', className)}
            >
                <LogOut size={15} aria-hidden="true" />
            </Button>
        );
    }

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isSigningOut}
            className={cn('text-text-muted hover:text-red-500 hover:bg-red-50', className)}
        >
            <LogOut size={14} aria-hidden="true" />
            {children ?? (isSigningOut ? 'Signing out…' : 'Sign out')}
        </Button>
    );
}
