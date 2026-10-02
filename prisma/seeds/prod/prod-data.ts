// prisma/seeds/prod/prod-data.ts
//
// BUSINESS DATA for the production setup seed (prisma/seeds/prod-setup.ts). Edit this file — not the script — to
// change what a fresh production database starts with.
//
// Rules:
//   • Wedding and Debut only (thesis scope). The script refuses any other event type.
//   • A package is matched by name + event type, a vendor by name. Re-running the script never duplicates or
//     overwrites them — change prices later on the admin Packages page, not by editing this file and re-running.
//   • Vendors start EMPTY on purpose: the demo vendors have made-up contact numbers, which coordinators must never
//     call. Add the real partner vendors here (see the example below) or through the admin Vendors page.

import type { EventType, VendorCategory } from "@/app/generated/prisma/client"

export interface ProdPackage {
  name: string
  description: string
  eventType: Extract<EventType, "WEDDING" | "DEBUT">
  price: number
  /** Kept for when location-based pricing is switched back on (PROVINCIAL_PRICING_ENABLED). Not shown today. */
  priceProvincial?: number
  inclusions: string[]
}

export interface ProdVendor {
  name: string
  category: VendorCategory
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  /** e.g. "Viber", "FB Messenger", "SMS" */
  contactChannel?: string
  coverageAreas: string[]
  notes?: string
}

export const PROD_PACKAGES: ProdPackage[] = [
  {
    name: "Classic Wedding Package",
    description: "Elegant all-inclusive wedding.",
    eventType: "WEDDING",
    price: 85000,
    priceProvincial: 97750,
    inclusions: ["8-hour coverage", "Bridal car", "Floral centerpieces (10 tables)", "Wedding cake (3 tiers)", "Sound system & emcee", "Photo & video", "Coordinator"],
  },
  {
    name: "Grand Wedding Package",
    description: "Full-scale premium wedding.",
    eventType: "WEDDING",
    price: 150000,
    priceProvincial: 172500,
    inclusions: ["12-hour coverage", "Bridal car", "Floral arch & centerpieces (20 tables)", "Premium cake (5 tiers)", "Full band", "Cinematic coverage", "Drone", "Prenup shoot", "2 coordinators"],
  },
  {
    name: "Elegant Debut Package",
    description: "Memorable 18th birthday celebration.",
    eventType: "DEBUT",
    price: 65000,
    priceProvincial: 74750,
    inclusions: ["8-hour coverage", "18 roses & candles", "Gown styling", "Floral (8 tables)", "Debut cake", "DJ", "Photo & video", "Coordinator"],
  },
  {
    name: "Premiere Debut Package",
    description: "Full-planning debut with a grand program.",
    eventType: "DEBUT",
    price: 95000,
    priceProvincial: 109250,
    inclusions: ["10-hour coverage", "18 roses, 18 candles & 18 treasures program", "Gown & hair styling", "Floral (15 tables)", "Debut cake (4 tiers)", "Band & DJ", "Photo & video", "2 coordinators"],
  },
]

export const PROD_VENDORS: ProdVendor[] = [
  // Example — copy, fill in with a REAL partner, and remove the comment markers:
  // {
  //   name: "Bloom & Petal Florals",
  //   category: "FLORALS",
  //   contactName: "Maria Cruz",
  //   contactPhone: "09171234567",
  //   contactChannel: "Viber",
  //   coverageAreas: ["Metro Manila", "Cavite"],
  //   notes: "₱12,000–₱18,000 per event. 2-week lead time.",
  // },
]
