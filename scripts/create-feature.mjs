#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Parse args ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const nameIndex = args.indexOf("--name")

if (nameIndex === -1 || !args[nameIndex + 1]) {
    console.error("❌  Usage: npm run create-feature -- --name <feature-name>")
    process.exit(1)
}

const rawName = args[nameIndex + 1].toLowerCase().replace(/\s+/g, "-")

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toCamel(str) {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function toPascal(str) {
    const camel = toCamel(str)
    return camel.charAt(0).toUpperCase() + camel.slice(1)
}

function toPlural(str) {
    if (str.endsWith("s") || str.endsWith("x") || str.endsWith("z") ||
        str.endsWith("ch") || str.endsWith("sh")) return str + "es"
    if (str.endsWith("y") && !["a","e","i","o","u"].includes(str.at(-2))) {
        return str.slice(0, -1) + "ies"
    }
    return str + "s"
}

function writeFile(filePath, content) {
    const dir = path.dirname(filePath)
    fs.mkdirSync(dir, { recursive: true })
    if (fs.existsSync(filePath)) {
        console.log(`  ⚠️  Already exists — skipped: ${filePath}`)
        return
    }
    fs.writeFileSync(filePath, content, "utf8")
    console.log(`  ✅  Created: ${filePath}`)
}

// ─── Derived names ───────────────────────────────────────────────────────────

const name = rawName
const pascal = toPascal(name)
const camel = toCamel(name)

// Pluralize the last word segment of the kebab name (e.g. "booking-payment" → "booking-payments")
// then derive pascal/camel from the plural form so we never double-pluralize.
const nameParts = name.split("-")
const lastPart = nameParts[nameParts.length - 1]
const pluralLast = toPlural(lastPart)
const pluralKebab = [...nameParts.slice(0, -1), pluralLast].join("-")
const pluralPascal = toPascal(pluralKebab)
const pluralCamel = toCamel(pluralKebab)

const base = `features/${name}`

// ─── File templates ───────────────────────────────────────────────────────────

const files = {

    // ── Constants ─────────────────────────────────────────────────────────────
    // Query keys and route constants — single source of truth for cache
    // invalidation across hooks.ts and api.ts.

    [`${base}/${name}.constants.ts`]:
        `export const ${camel}Keys = {
  all: ["${camel}"] as const,
  lists: () => [...${camel}Keys.all, "list"] as const,
  detail: (id: string) => [...${camel}Keys.all, "detail", id] as const,
} as const

export const ${camel}Routes = {
  base: "/${pluralCamel}",
  detail: (id: string) => \`/${pluralCamel}/\${id}\`,
} as const
`,

    // ── Schema ────────────────────────────────────────────────────────────────
    // Zod schemas shared between client forms and server API route handlers.
    // Import these on both sides — never define validation in two places.

    [`${base}/${name}.schema.ts`]:
        `import { z } from "zod"

export const create${pascal}Schema = z.object({
  // name: z.string().min(1, "Name is required"),
})

export const update${pascal}Schema = create${pascal}Schema.partial()

export type Create${pascal}Input = z.infer<typeof create${pascal}Schema>
export type Update${pascal}Input = z.infer<typeof update${pascal}Schema>
`,

    // ── Types ─────────────────────────────────────────────────────────────────
    // TypeScript types specific to this feature.
    // Import Prisma model types from @/types — never from the generated path.

    [`${base}/${name}.types.ts`]:
        `// import type { ${pascal} } from "@/types"

export type ${pascal}WithRelations = {
  id: string
  // extend with Prisma relations as needed
  createdAt: Date
  updatedAt: Date
}
`,

    // ── Query ─────────────────────────────────────────────────────────────────
    // Prisma queries — server-side only.
    // Import and call these directly from /app/api route handlers.
    // Never import this file into client components or hooks.

    [`${base}/${name}.query.ts`]:
        `"use server"

import { prisma } from "@/lib/prisma"
import type { Create${pascal}Input, Update${pascal}Input } from "./${name}.schema"

export async function getAll${pluralPascal}() {
  return prisma.${camel}.findMany({
    orderBy: { createdAt: "desc" },
  })
}

export async function get${pascal}ById(id: string) {
  return prisma.${camel}.findUnique({
    where: { id },
  })
}

export async function create${pascal}(data: Create${pascal}Input) {
  return prisma.${camel}.create({
    data,
  })
}

export async function update${pascal}(id: string, data: Update${pascal}Input) {
  return prisma.${camel}.update({
    where: { id },
    data,
  })
}

export async function delete${pascal}(id: string) {
  return prisma.${camel}.delete({
    where: { id },
  })
}
`,

    // ── API ───────────────────────────────────────────────────────────────────
    // Axios calls to /app/api route handlers — client-side only.
    // These are the functions that hooks.ts wraps with useQuery / useMutation.
    // Never call Prisma or import query.ts from here.

    [`${base}/${name}.api.ts`]:
        `"use client"

import api from "@/lib/axios"
import type { ${pascal}WithRelations } from "./${name}.types"
import type { Create${pascal}Input, Update${pascal}Input } from "./${name}.schema"
import type { ApiResponse, PaginatedResponse } from "@/types"

export async function fetchAll${pluralPascal}(): Promise<PaginatedResponse<${pascal}WithRelations>> {
  const { data } = await api.get<PaginatedResponse<${pascal}WithRelations>>("/${pluralCamel}")
  return data
}

export async function fetch${pascal}(id: string): Promise<${pascal}WithRelations> {
  const { data } = await api.get<ApiResponse<${pascal}WithRelations>>("/${pluralCamel}/" + id)
  return data.data
}

export async function create${pascal}(input: Create${pascal}Input): Promise<${pascal}WithRelations> {
  const { data } = await api.post<ApiResponse<${pascal}WithRelations>>("/${pluralCamel}", input)
  return data.data
}

export async function update${pascal}(id: string, input: Update${pascal}Input): Promise<${pascal}WithRelations> {
  const { data } = await api.patch<ApiResponse<${pascal}WithRelations>>("/${pluralCamel}/" + id, input)
  return data.data
}

export async function delete${pascal}(id: string): Promise<void> {
  await api.delete("/${pluralCamel}/" + id)
}
`,

    // ── Hooks ─────────────────────────────────────────────────────────────────
    // TanStack React Query wrappers around api.ts functions — client-side only.
    // Components call hooks. Hooks call api.ts. Never skip this layer.

    [`${base}/${name}.hooks.ts`]:
        `"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ${camel}Keys } from "./${name}.constants"
import {
  fetchAll${pluralPascal},
  fetch${pascal},
  create${pascal},
  update${pascal},
  delete${pascal},
} from "./${name}.api"
import type { Create${pascal}Input, Update${pascal}Input } from "./${name}.schema"

export function use${pluralPascal}() {
  return useQuery({
    queryKey: ${camel}Keys.lists(),
    queryFn: fetchAll${pluralPascal},
  })
}

export function use${pascal}(id: string) {
  return useQuery({
    queryKey: ${camel}Keys.detail(id),
    queryFn: () => fetch${pascal}(id),
    enabled: !!id,
  })
}

export function useCreate${pascal}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Create${pascal}Input) => create${pascal}(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${camel}Keys.lists() })
    },
  })
}

export function useUpdate${pascal}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Update${pascal}Input }) =>
      update${pascal}(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ${camel}Keys.lists() })
      queryClient.invalidateQueries({ queryKey: ${camel}Keys.detail(id) })
    },
  })
}

export function useDelete${pascal}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => delete${pascal}(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${camel}Keys.lists() })
    },
  })
}
`,

    // ── Barrel ────────────────────────────────────────────────────────────────
    // Empty barrel — use the Auto Barrel VS Code extension (nicoespeon.autob
    // arrel) to populate this automatically as you build the feature.

    [`${base}/index.ts`]: ``,
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`\n🚀  Creating feature: ${name}\n`)

const cwd = process.cwd()

for (const [filePath, content] of Object.entries(files)) {
    writeFile(path.join(cwd, filePath), content)
}

// Create components folder with a .gitkeep so it's tracked by git
const componentsDir = path.join(cwd, base, "components")
const gitkeep = path.join(componentsDir, ".gitkeep")
fs.mkdirSync(componentsDir, { recursive: true })
if (!fs.existsSync(gitkeep)) {
    fs.writeFileSync(gitkeep, "", "utf8")
    console.log(`  ✅  Created: ${base}/components/.gitkeep`)
}

console.log(`
✨  Feature "${name}" scaffolded at features/${name}/

  features/${name}/
  ├── components/            ← add UI components here
  ├── ${name}.constants.ts   ← query keys + route constants
  ├── ${name}.schema.ts      ← zod schemas (shared server + client)
  ├── ${name}.types.ts       ← typescript types
  ├── ${name}.query.ts       ← prisma queries  [server only]
  ├── ${name}.api.ts         ← axios calls     [client only]
  ├── ${name}.hooks.ts       ← react query     [client only]
  └── index.ts               ← barrel (fill with Auto Barrel extension)

Boundaries:
  /app/api routes  →  import from  ${name}.query.ts
  components       →  import from  ${name}.hooks.ts
  hooks            →  import from  ${name}.api.ts  +  ${name}.constants.ts
  api              →  import from  ${name}.schema.ts  +  ${name}.types.ts

Next: open features/${name}/${name}.schema.ts and define your shapes!
`)
