// e2e/scripts/export-results.mjs
//
// Turns Playwright's JSON report (e2e/results/results.json) into e2e/results/results.csv:
// one row per test case ID, ready to copy into the "Test Cases" sheet of
// FabMemories_Functional_Test_Cases.xlsx (Actual Result / Status / Date Tested columns).
//
//   node e2e/scripts/export-results.mjs
import fs from "node:fs"
import path from "node:path"

const input = path.resolve("e2e/results/results.json")
const output = path.resolve("e2e/results/results.csv")
if (!fs.existsSync(input)) {
  console.error("No e2e/results/results.json yet — run `npm run e2e` first.")
  process.exit(1)
}
const report = JSON.parse(fs.readFileSync(input, "utf8"))

const rows = []
function walk(suite) {
  for (const s of suite.suites ?? []) walk(s)
  for (const spec of suite.specs ?? []) {
    const m = /^(TC-(?:FR\d{2}|EMAIL)-\d{2})\s+(.*)$/.exec(spec.title)
    if (!m) continue
    for (const t of spec.tests ?? []) {
      if (t.projectName !== "desktop-chrome") continue
      const last = t.results?.[t.results.length - 1]
      const fixme = (t.annotations ?? []).some((a) => a.type === "fixme")
      const skipNote = (t.annotations ?? []).find((a) => a.type === "skip")?.description
      let status = "Not tested"
      if (fixme) status = "Not implemented"
      else if (last?.status === "passed" && !(last.errors?.length)) status = "Pass"
      else if (["failed", "timedOut", "interrupted"].includes(last?.status) || last?.errors?.length) status = "Fail"
      const error = (last?.errors?.[0]?.message ?? "").replace(/\u001b\[[0-9;]*m/g, "").split("\n")[0]
      rows.push({
        id: m[1],
        title: m[2],
        status,
        date: last?.startTime ? last.startTime.slice(0, 10) : "",
        seconds: last?.duration ? (last.duration / 1000).toFixed(1) : "",
        note: error || skipNote || (fixme ? "Feature not implemented — see e2e/README.md §6" : ""),
      })
    }
  }
}
for (const s of report.suites ?? []) walk(s)
rows.sort((a, b) => a.id.localeCompare(b.id))

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
const csv = [["Test Case ID", "Scenario", "Status", "Date Tested", "Duration (s)", "Note"].map(esc).join(",")]
for (const r of rows) csv.push([r.id, r.title, r.status, r.date, r.seconds, r.note].map(esc).join(","))
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, csv.join("\n") + "\n")

const count = (s) => rows.filter((r) => r.status === s).length
console.log(`Wrote ${rows.length} rows to ${path.relative(process.cwd(), output)}`)
console.log(`Pass ${count("Pass")} · Fail ${count("Fail")} · Not implemented ${count("Not implemented")} · Not tested ${count("Not tested")}`)
