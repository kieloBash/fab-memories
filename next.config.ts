import type { NextConfig } from "next"
import { STATIC_SECURITY_HEADERS } from "@/lib/security/headers"

const nextConfig: NextConfig = {
  // Do not advertise the framework in every response.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/(.*)", headers: STATIC_SECURITY_HEADERS }]
  },
}

export default nextConfig
