// features/auth/portal-check.ts
"use client"

import api, { getApiErrorMessage } from "@/lib/axios"
import { isAxiosError } from "axios"

export type PortalCheck =
  | { ok: true; destination: string }
  | { ok: false; code: string; message: string }

/**
 * Asks the server whether this freshly signed-in account belongs on this login page.
 * FAILS CLOSED: any error (network, 500) counts as "not verified", so a sign-in is never let through unchecked.
 *
 * `getToken` is Clerk's session token; it is sent explicitly so the check does not depend on the browser cookie
 * having been written yet.
 */
export async function checkPortal(portal: "client" | "staff", getToken: () => Promise<string | null> | undefined): Promise<PortalCheck> {
  try {
    const token = await getToken()
    const { data } = await api.post<{ ok: true; destination: string }>(
      "/auth/portal-check",
      { portal },
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    )
    return { ok: true, destination: data.destination }
  } catch (err) {
    if (isAxiosError(err) && err.response?.data?.code) {
      return { ok: false, code: err.response.data.code, message: err.response.data.error ?? getApiErrorMessage(err) }
    }
    return { ok: false, code: "CHECK_FAILED", message: "We couldn't verify your account just now. Please try signing in again." }
  }
}
