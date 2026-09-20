// prisma/seed-integrity.ts — kept so older commands still work. The real seed is prisma/seeds/03-integrity.ts.
//   npx tsx prisma/seed-integrity.ts [--reset-only]   ==   npx tsx prisma/seed.ts --only=integrity  /  --reset=integrity
import { main } from "./seeds/cli"

const args = process.argv.slice(2)
main(args.includes("--reset-only") ? ["--reset=integrity"] : ["--only=integrity", ...args])
