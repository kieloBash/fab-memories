// app/(pages)/(protected)/portal/account/page.tsx
"use client"

import { PageHeader } from "@/components/ui/page-header"
import { SPRING } from "@/lib/framer/framer-utils"
import { UserProfile } from "@clerk/nextjs"
import { motion } from "framer-motion"
import { UserCircle } from "lucide-react"

/**
 * This page is fully functional (not a placeholder) — it uses Clerk's
 * hosted <UserProfile /> component, which already handles name, email,
 * password, and security settings without needing any custom API routes.
 * The `appearance` prop re-skins it to match the app's pink brand tokens
 * instead of Clerk's default blue.
 */
export default function ClientAccountPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}
      className="flex flex-col gap-6"
    >
      <PageHeader
        title="Account settings"
        subtitle="Manage your name, email, and password"
        icon={UserCircle}
      />

      <div className="rounded-xl border border-border bg-white overflow-hidden [&_.cl-rootBox]:w-full [&_.cl-card]:shadow-none [&_.cl-card]:border-0 [&_.cl-navbar]:hidden">
        <UserProfile
          routing="hash"
          appearance={{
            variables: {
              colorPrimary: "#F564A9",
              colorInput: "#1a0a12",
              colorForeground: "#6b4060",
              colorBackground: "#ffffff",
              borderRadius: "0.875rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-0 w-full",
              navbar: "hidden",
              navbarMobileMenuButton: "hidden",
              pageScrollBox: "p-5",
            },
          }}
        />
      </div>
    </motion.div>
  )
}
