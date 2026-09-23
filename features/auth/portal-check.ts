// features/auth/portal-check.ts
"use client"

import api from "@/lib/axios"
import { signInErrorMessage } from "@/lib/clerk/portal"
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
    // Messages come from ONE table (lib/clerk/portal.ts) so the page shows the same text before and after the
    // sign-out redirect that carries the code.
    const code = (isAxiosError(err) && err.response?.data?.code) || "CHECK_FAILED"
    return { ok: false, code, message: signInErrorMessage(code, portal) }
  }
}
