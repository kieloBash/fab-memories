// features/availability/index.ts — client-safe barrel
export { availabilityKeys, availabilityRoutes } from "./availability.constants"
export { addUnavailableDaySchema } from "./availability.schema"
export type { AddUnavailableDayInput } from "./availability.schema"
export type { UnavailableDay } from "./availability.types"
export { fetchMyUnavailableDays, addMyUnavailableDay, removeMyUnavailableDay } from "./availability.api"
export { useMyUnavailableDays, useAddUnavailableDay, useRemoveUnavailableDay } from "./availability.hooks"
