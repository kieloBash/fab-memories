// prisma/seed.ts — the MAIN SEED. Run `npx tsx prisma/seed.ts --help`.
//
// The seeds themselves live in prisma/seeds/ (registered in prisma/seeds/index.ts).
// `npx prisma db seed` runs this file with no options: it seeds the base data only if the database is empty.

import { main } from "./seeds/cli"

main(process.argv.slice(2))
