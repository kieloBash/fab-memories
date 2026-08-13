'use client';

import { useStaffAccounts, useUpdateStaffAccount } from '@/lib/api/staff-accounts';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ROLE_OPTIONS = ['COORDINATOR', 'VENDOR', 'ADMIN'] as const;

export default function EditStaffAccountPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: users, isLoading } = useStaffAccounts();
    const { mutate, isPending } = useUpdateStaffAccount();

    const user = users?.find((u) => u.id === id);

    const [form, setForm] = useState({
        fullName: '',
        role: 'COORDINATOR' as (typeof ROLE_OPTIONS)[number],
        isActive: true,
    });

    useEffect(() => {
        if (user) {
            setForm({ fullName: user.fullName, role: user.role as any, isActive: user.isActive });
        }
    }, [user]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        mutate(
            { id, ...form },
            {
                onSuccess: () => {
                    router.push('/staff/admin/users');
                    router.refresh();
                },
            },
        );
    }

    if (isLoading) return <p className="text-sm text-slate-500">Loading...</p>;
    if (!user) return <p className="text-sm text-red-600">Account not found.</p>;

    return (
        <div className="mx-auto max-w-md">
            <h1 className="mb-6 text-xl font-semibold text-slate-800">Edit Staff Account</h1>
            <p className="mb-4 text-sm text-slate-500">Username: {user.username}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                    <input
                        type="text"
                        required
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                    <select
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                    >
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="isActive"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <label htmlFor="isActive" className="text-sm text-slate-700">
                        Account active
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    );
}