// test-harness/integration/_support/steps.ts
//
// For STORY-style suites whose tests share state and must run in order: once a step fails, the remaining steps are
// SKIPPED (with the reason) instead of failing too, so the report points at the first real problem.
//
//   const step = storySteps()
//   step("1. create", async () => { ... })
//   step("2. edit", async () => { ... })   // skipped if step 1 failed
import { it } from "vitest"

export function storySteps() {
  let broken: string | null = null
  return function step(name: string, fn: () => Promise<void>) {
    it(name, async (ctx) => {
      if (broken) ctx.skip(`an earlier step failed: "${broken}"`)
      try { await fn() } catch (err) { broken = name; throw err }
    })
  }
}
