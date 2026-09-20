// features/reports/components/views/report-view-types.ts

/** Where deep links point — the admin and coordinator areas have parallel routes. */
export type BasePath = "/staff/admin" | "/staff/coordinator"

export interface ViewProps<R> {
  report: R
  basePath: BasePath
  onPage: (page: number) => void
  /** True while a new page/filter is loading over the previous result. */
  isFetching: boolean
}

export const bookingHref = (base: BasePath, id: string) => `${base}/bookings/${id}`
export const paymentHref = (base: BasePath, id: string) => `${base}/payments/${id}`
