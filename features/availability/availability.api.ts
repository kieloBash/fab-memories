// features/availability/availability.api.ts
"use client"

import api from "@/lib/axios"
import { availabilityRoutes } from "./availability.constants"
import type { AddUnavailableDayInput } from "./availability.schema"
import type { UnavailableDay } from "./availability.types"

export async function fetchMyUnavailableDays(): Promise<UnavailableDay[]> {
  const { data } = await api.get<UnavailableDay[]>(availabilityRoutes.list)
  return data
}
export async function addMyUnavailableDay(input: AddUnavailableDayInput): Promise<UnavailableDay> {
  const { data } = await api.post<UnavailableDay>(availabilityRoutes.list, input)
  return data
}
export async function removeMyUnavailableDay(id: string): Promise<void> {
  await api.delete(availabilityRoutes.one(id))
}
