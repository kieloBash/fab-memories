'use client'

import { useClerk } from '@clerk/nextjs'
import { useState } from 'react'
import { recordSignOut } from '@/app/actions/auth'

export function SignOutButton() {
  const { signOut } = useClerk()
  const [pending, setPending] = useState(false)

  async function handleSignOut() {
    setPending(true)
    try {
      // Order matters: audit first, then destroy the session.
      await recordSignOut()
    } catch {
      // Never block sign-out on an audit failure.
    } finally {
      await signOut({ redirectUrl: '/' })
    }
  }

  return (
    <button onClick={handleSignOut} disabled={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
