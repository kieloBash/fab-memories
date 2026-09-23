// features/availability/availability.constants.ts

export const availabilityKeys = {
  all: ["availability"] as const,
  mine: () => [...availabilityKeys.all, "mine"] as const,
  forCoordinator: (id: string) => [...availabilityKeys.all, id] as const,
}
export const availabilityRoutes = {
  list: "/staff/availability",
  one: (id: string) => `/staff/availability/${id}`,
} as const
