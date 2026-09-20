// test-harness/auth.stub.ts
//
// TEST-ONLY replacement for lib/clerk/auth.ts, used by run-route-tests.sh so the
// report route handlers can be exercised without a Clerk session.
// The runner swaps this in temporarily and ALWAYS restores the real file.
//
//   TEST_ROLE  = ADMIN | COORDINATOR | CLIENT | VENDOR   (unset = signed out)
//   TEST_USER  = username of the Prisma user acting as the session
import { prisma } from "@/lib/prisma"

export async function requireRole(roles: string[]) {
  const role = process.env.TEST_ROLE
  if (!role) throw new Error("UNAUTHENTICATED")
  if (!roles.includes(role)) throw new Error("FORBIDDEN")
  return role
}

export async function getCurrentDbUser() {
  const u = process.env.TEST_USER
  return u ? prisma.user.findUnique({ where: { username: u } }) : null
}
