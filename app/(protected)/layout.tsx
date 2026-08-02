import { ensureUser } from '@/lib/sync-user'
import { redirect } from 'next/navigation'

/**
 * Every authenticated area sits under this layout, so the local User row is
 * guaranteed to exist before any child page queries it. This is the webhook
 * replacement: sync happens on the first authenticated render.
 */
export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await ensureUser()

    if (!user) redirect('/sign-in')
    if (!user.isActive) redirect('/account-disabled')

    return <>{children}</>
}