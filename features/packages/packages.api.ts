// features/packages/packages.api.ts
"use client"

import api from "@/lib/axios"
import { packageRoutes } from "./packages.constants"
import type { Package, PackageWithBookingCount } from "./packages.types"
import type { CreatePackageInput, UpdatePackageInput } from "./packages.schema"

export async function fetchPackages(activeOnly?: boolean): Promise<PackageWithBookingCount[]> {
  const { data } = await api.get<PackageWithBookingCount[]>(packageRoutes.packages, {
    params: activeOnly ? { active: "true" } : undefined,
  })
  return data
}

export async function fetchPackage(id: string): Promise<PackageWithBookingCount> {
  const { data } = await api.get<PackageWithBookingCount>(packageRoutes.package(id))
  return data
}

export async function createPackage(input: CreatePackageInput): Promise<Package> {
  const { data } = await api.post<Package>(packageRoutes.packages, input)
  return data
}

export async function updatePackage(id: string, input: UpdatePackageInput): Promise<Package> {
  const { data } = await api.patch<Package>(packageRoutes.package(id), input)
  return data
}
