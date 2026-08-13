import { getApiErrorMessage } from '@/lib/axios';
import {
    useMutation,
    useQueryClient,
    type UseMutationOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';

interface UseApiMutationConfig<TData, TVariables>
    extends Omit<UseMutationOptions<TData, unknown, TVariables>, 'mutationFn'> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    /** Query keys to invalidate on success — e.g. [['staff-accounts']] */
    invalidateKeys?: unknown[][];
    /** Success toast message. Omit to suppress the success toast entirely. */
    onSuccessMessage?: string | ((data: TData) => string);
    /** Set to false to suppress the automatic error toast for this mutation. */
    showErrorToast?: boolean;
}

/**
 * Wraps useMutation with standard behavior for this app:
 *  - normalizes axios errors into readable messages
 *  - invalidates related queries on success
 *  - shows success/error toasts via Sonner automatically
 *
 * Keeps individual feature hooks (useCreateStaffAccount, etc.) short —
 * they just declare the mutationFn + what to invalidate + toast copy.
 */
export function useApiMutation<TData, TVariables>({
    mutationFn,
    invalidateKeys = [],
    onSuccessMessage,
    showErrorToast = true,
    onSuccess,
    onError,
    ...options
}: UseApiMutationConfig<TData, TVariables>) {
    const queryClient = useQueryClient();

    return useMutation<TData, unknown, TVariables>({
        mutationFn,
        onSuccess: (data, variables, context) => {
            invalidateKeys.forEach((key) => {
                queryClient.invalidateQueries({ queryKey: key });
            });

            if (onSuccessMessage) {
                const message =
                    typeof onSuccessMessage === 'function' ? onSuccessMessage(data) : onSuccessMessage;
                toast.success(message);
            }

            onSuccess?.(data, variables, "", context as any);
        },
        onError: (error, variables, context) => {
            const message = getApiErrorMessage(error);
            if (showErrorToast) {
                toast.error(message);
            }
            onError?.(error, variables, "", context as any);
        },
        ...options,
    });
}