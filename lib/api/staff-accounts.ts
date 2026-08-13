import type { Role } from '@/app/generated/prisma/client';
import { useApiMutation } from '@/lib/api/mutation';
import { api } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

export interface CreateStaffAccountInput {
    username: string;
    password: string;
    fullName: string;
    role: Role;
}

export interface UpdateStaffAccountInput {
    id: string;
    fullName?: string;
    isActive?: boolean;
    role?: Role;
}

export interface StaffAccount {
    id: string;
    clerkId: string;
    username: string | null;
    fullName: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
}

const STAFF_ACCOUNTS_KEY = ['staff-accounts'];

async function createStaffAccount(input: CreateStaffAccountInput): Promise<StaffAccount> {
    const { data } = await api.post('/staff-accounts', input);
    return data;
}

async function updateStaffAccount({ id, ...input }: UpdateStaffAccountInput): Promise<StaffAccount> {
    const { data } = await api.patch(`/staff-accounts/${id}`, input);
    return data;
}

async function deactivateStaffAccount(id: string): Promise<StaffAccount> {
    const { data } = await api.delete(`/staff-accounts/${id}`);
    return data;
}

async function fetchStaffAccounts(): Promise<StaffAccount[]> {
    const { data } = await api.get('/staff-accounts');
    return data;
}

export function useStaffAccounts() {
    return useQuery({
        queryKey: STAFF_ACCOUNTS_KEY,
        queryFn: fetchStaffAccounts,
    });
}

export function useCreateStaffAccount() {
    return useApiMutation({
        mutationFn: createStaffAccount,
        invalidateKeys: [STAFF_ACCOUNTS_KEY],
        onSuccessMessage: (data) => `Account "${data.username}" created`,
    });
}

export function useUpdateStaffAccount() {
    return useApiMutation({
        mutationFn: updateStaffAccount,
        invalidateKeys: [STAFF_ACCOUNTS_KEY],
        onSuccessMessage: 'Account updated',
    });
}

export function useDeactivateStaffAccount() {
    return useApiMutation({
        mutationFn: deactivateStaffAccount,
        invalidateKeys: [STAFF_ACCOUNTS_KEY],
        onSuccessMessage: 'Account deactivated',
    });
}