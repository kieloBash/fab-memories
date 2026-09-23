// features/availability/availability.hooks.ts
"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/axios"
import { availabilityKeys } from "./availability.constants"
import { addMyUnavailableDay, fetchMyUnavailableDays, removeMyUnavailableDay } from "./availability.api"
import type { AddUnavailableDayInput } from "./availability.schema"

export function useMyUnavailableDays() {
  return useQuery({ queryKey: availabilityKeys.mine(), queryFn: fetchMyUnavailableDays })
}

export function useAddUnavailableDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddUnavailableDayInput) => addMyUnavailableDay(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: availabilityKeys.mine() })
      if (data.conflictsWithAssignment) toast.warning(`You already have an assignment on ${data.date} — you may want to let an admin know.`)
      else toast.success("Marked unavailable")
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}

export function useRemoveUnavailableDay() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => removeMyUnavailableDay(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: availabilityKeys.mine() }); toast.success("Removed") },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
}
