// app/(pages)/(protected)/(staff)/staff/page.tsx

'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center">
        <Sparkles size={20} className="text-primary animate-pulse" aria-hidden="true" />
      </div>
      <p className="text-[13px] text-text-muted tracking-tight">
        Loading your dashboard...
      </p>
    </div>
  );
}
