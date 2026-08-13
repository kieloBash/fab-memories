'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateStaffAccount } from '@/lib/api/staff-accounts';

const ROLE_OPTIONS = ['COORDINATOR', 'VENDOR', 'ADMIN'] as const;

export default function NewStaffAccountPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        username: '',
        password: 'FabMemories123!',
        fullName: '',
        role: 'COORDINATOR' as (typeof ROLE_OPTIONS)[number],
    });

    const { mutate, isPending } = useCreateStaffAccount();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        mutate(form, {
            onSuccess: () => {
                router.push('/staff/admin/users');
                router.refresh();
            },
        });
    }

    return (
        <div className="mx-auto max-w-md">
            <h1 className="mb-6 text-xl font-semibold text-slate-800">Create Staff Account</h1>

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
                    <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
                    <input
                        type="text"
                        required
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Temporary Password</label>
                    <input
                        type="password"
                        required
                        minLength={8}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
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

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                    {isPending ? 'Creating...' : 'Create Account'}
                </button>
            </form>
        </div>
    );
}