// features/packages/packages.query.ts
"use server"

import { prisma } from "@/lib/prisma"
import type { EventType } from "@/app/generated/prisma/client"
import type { CreatePackageInput, UpdatePackageInput } from "./packages.schema"

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

export async function updatePackageRecord(id: string, input: UpdatePackageInput) {
  return prisma.package.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      eventType: input.eventType,
      price: input.price,
      inclusions: input.inclusions,
      isActive: input.isActive,
    },
  })
}
