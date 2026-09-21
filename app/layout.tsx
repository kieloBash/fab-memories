import { Geist_Mono, Inter } from "next/font/google";

import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/providers/theme-provider";
import { headers } from "next/headers";
import "./globals.css";

import { Toaster } from '@/components/ui/sonner';
import { Providers } from "@/providers/query-provider";
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // The per-request nonce that proxy.ts put on the Content-Security-Policy. Scripts must carry it to run under the strict policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <ClerkProvider dynamic>
      <html
        lang="en"
        suppressHydrationWarning
        className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
      >
        <body>
          <Providers>
            <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
            <Toaster richColors position="top-right" />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
