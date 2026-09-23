// features/packages/packages.query.ts

import { prisma } from "@/lib/prisma"
import type { EventType, Prisma } from "@/app/generated/prisma/client"
import type { CreatePackageInput, UpdatePackageInput } from "@/features/packages/packages.schema"

export async function getAllPackages(activeOnly = false) {
  return prisma.package.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getPackagesByEventType(eventType: EventType) {
  return prisma.package.findMany({
    where: { eventType, isActive: true },
    orderBy: { price: "asc" },
  })
}

export async function getPackageById(id: string) {
  return prisma.package.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  })
}

export async function createPackageRecord(input: CreatePackageInput) {
  return prisma.package.create({
    data: {
      name: input.name,
      description: input.description,
      eventType: input.eventType,
      price: input.price,
      inclusions: input.inclusions,
      isActive: input.isActive ?? true,
    },
  })
}

/**
 * PARTIAL update — a field the caller did not send is left unchanged (see updatePackageSchema; NOT derived
 * with .partial(), which would silently reactivate a deactivated package on the next unrelated edit).
 */
export async function updatePackageRecord(id: string, input: UpdatePackageInput) {
  const data: Prisma.PackageUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.description !== undefined) data.description = input.description || null
  if (input.eventType !== undefined) data.eventType = input.eventType
  if (input.price !== undefined) data.price = input.price
  if (input.inclusions !== undefined) data.inclusions = input.inclusions
  if (input.isActive !== undefined) data.isActive = input.isActive

  return prisma.package.update({ where: { id }, data })
}
