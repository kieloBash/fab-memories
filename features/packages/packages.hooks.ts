// features/packages/packages.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { packageKeys } from "./packages.constants"
import {
  createPackage,
  fetchPackage,
  fetchPackages,
  fetchPublicPackages,
  updatePackage,
} from "./packages.api"
import type { CreatePackageInput, UpdatePackageInput } from "./packages.schema"

// ── Queries ───────────────────────────────────────────────────

export function usePackages(activeOnly?: boolean) {
  return useQuery({
    queryKey: packageKeys.list({ activeOnly }),
    queryFn: () => fetchPackages(activeOnly),
  })
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: packageKeys.detail(id),
    queryFn: () => fetchPackage(id),
    enabled: !!id,
  })
}

/**
 * Public, unauthenticated package listing — safe to call from the
 * marketing site (no signed-in user required).
 */
export function usePublicPackages() {
  return useQuery({
    queryKey: packageKeys.publicList(),
    queryFn: fetchPublicPackages,
    staleTime: 5 * 60 * 1000, // marketing content — cache 5 min
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function useCreatePackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePackageInput) => createPackage(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() })
      toast.success(`Package "${data.name}" created successfully`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}

export function useUpdatePackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePackageInput }) =>
      updatePackage(id, input),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: packageKeys.lists() })
      queryClient.invalidateQueries({ queryKey: packageKeys.detail(id) })
      toast.success(`Package "${data.name}" updated successfully`)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error))
    },
  })
}
