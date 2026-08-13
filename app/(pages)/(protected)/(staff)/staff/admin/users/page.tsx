'use client';

import { useDeactivateStaffAccount, useStaffAccounts } from '@/lib/api/staff-accounts';
import Link from 'next/link';

export default function StaffUsersListPage() {
    const { data: users, isLoading } = useStaffAccounts();
    const { mutate: deactivate, isPending: deactivating } = useDeactivateStaffAccount();

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-slate-800">Staff & Vendor Accounts</h1>
                <Link
                    href="/staff/admin/users/new"
                    className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                >
                    + New Account
                </Link>
            </div>

            {isLoading ? (
                <p className="text-sm text-slate-500">Loading...</p>
            ) : (
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b text-left text-slate-500">
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Username</th>
                            <th className="py-2 pr-4">Role</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Created</th>
                            <th className="py-2 pr-4"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {users?.map((u) => (
                            <tr key={u.id} className="border-b">
                                <td className="py-2 pr-4">{u.fullName}</td>
                                <td className="py-2 pr-4">{u.username}</td>
                                <td className="py-2 pr-4">{u.role}</td>
                                <td className="py-2 pr-4">{u.isActive ? 'Active' : 'Inactive'}</td>
                                <td className="py-2 pr-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="py-2 pr-4">
                                    <Link href={`/staff/admin/users/${u.id}/edit`} className="text-slate-700 hover:underline">
                                        Edit
                                    </Link>
                                    {u.isActive && (
                                        <button
                                            onClick={() => deactivate(u.id)}
                                            disabled={deactivating}
                                            className="text-red-600 hover:underline disabled:opacity-50"
                                        >
                                            Deactivate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users?.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-6 text-center text-slate-400">
                                    No staff accounts yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
}