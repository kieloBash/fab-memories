// prisma/seeds/index.ts — THE REGISTRY. Seeds run in this order.
//
// To add a seed: create prisma/seeds/NN-name.ts (copy _template.ts), then add ONE import and ONE line below.

import { seed as base } from "./01-base"
import { seed as reports } from "./02-reports"
import { seed as integrity } from "./03-integrity"
import { seed as testing } from "./04-testing"
import type { SeedModule } from "./_shared"

export const SEEDS: SeedModule[] = [
  base,
  reports,
  integrity,
  testing,
  // ← add new seeds here
]
