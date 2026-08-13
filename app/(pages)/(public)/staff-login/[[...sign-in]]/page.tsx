import { SignIn } from '@clerk/nextjs';

/**
 * Staff sign-in only — no sign-up flow exists for this area.
 * Accounts are created exclusively by an admin via /staff/admin/users/new,
 * which calls the /api/staff-accounts route (Clerk backend API).
 * Since accounts are created directly (not self-registered), there's
 * no email verification step — the identifier here is username.
 */
export default function StaffLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
            <div className="w-full max-w-md">
                <h1 className="mb-6 text-center text-2xl font-semibold text-slate-800">
                    Staff Sign In
                </h1>
                <SignIn path="/staff-login" routing="path" fallbackRedirectUrl="/staff" forceRedirectUrl={"/staff"} />
            </div>
        </div>
    );
}