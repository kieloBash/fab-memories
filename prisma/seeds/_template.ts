// prisma/seeds/_template.ts — COPY THIS to add a seed.
//
//   1. cp prisma/seeds/_template.ts prisma/seeds/04-my-seed.ts
//   2. Change the TAG, the description, and fill in run().
//   3. Register it in prisma/seeds/index.ts (one import + one line).
//   4. npx tsx prisma/seed.ts --with=my-seed        and to remove it later:   --reset=my-seed
//
// Rules of thumb
//   - Tag everything you create (e.g. Booking.staffNote starts with TAG) so reset() can remove exactly that.
//   - run() should call reset() first, so running it twice never duplicates data.
//   - Delete children before parents (payments/installments before bookings).
//   - Users, packages and vendors come from the "base" seed — look them up, don't recreate them.

import { prisma, type SeedModule } from "./_shared"

const TAG = "[seed:my-seed]"

export async function reset() {
  await prisma.payment.deleteMany({ where: { booking: { staffNote: { startsWith: TAG } } } })
  await prisma.booking.deleteMany({ where: { staffNote: { startsWith: TAG } } })
}

export async function run() {
  await reset()

  const client = await prisma.user.findUnique({ where: { username: "client_anna" } })
  const pkg = await prisma.package.findFirst()
  if (!client || !pkg) throw new Error("Run the base seed first.")

  // TODO: create your data here, e.g.
  // await prisma.booking.create({ data: { clientId: client.id, packageId: pkg.id, ..., staffNote: `${TAG} example` } })

  console.log("  ✅  my-seed data created")
}

export const seed: SeedModule = {
  name: "my-seed",
  kind: "addon",
  description: "One line saying what this seed is for",
  requires: ["base"],
  run: async () => { await run() },
  reset: async () => { await reset(); console.log("\n✨  my-seed data removed.\n") },
}
