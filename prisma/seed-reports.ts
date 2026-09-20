// prisma/seed-reports.ts — kept so older commands still work. The real seed is prisma/seeds/02-reports.ts.
//   npx tsx prisma/seed-reports.ts [--bulk=N] [--reset-only]   ==   npx tsx prisma/seed.ts --only=reports [--bulk=N]  /  --reset=reports
import { main } from "./seeds/cli"

const args = process.argv.slice(2)
main(args.includes("--reset-only") ? ["--reset=reports"] : ["--only=reports", ...args])
