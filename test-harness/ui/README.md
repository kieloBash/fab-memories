<!-- test-harness/ui/README.md -->
# UI tests (Module 8)

38 component tests (vitest + jsdom + Testing Library). They render the **real** components against **real report
payloads** captured from the seeded database (`fixtures/*.json`), with only the network (`@/lib/axios`), toasts and
Next's `Link`/router mocked.

```bash
npm i -D vitest@^3 jsdom @testing-library/react @testing-library/dom @testing-library/user-event \
         @testing-library/jest-dom vite-tsconfig-paths        # add --legacy-peer-deps if npm complains
npm run test:ui          # this project only  (npm test = UI + unit)
```

The repo now has three Vitest projects (ui, unit, integration); see `test-harness/README.md`.

| File | Covers |
|---|---|
| `report-screens.test.tsx` | catalog roles · each report renders data · broken-chain alert · error card · date-range guard · dropdown filters + page reset · presets · debounced search · CSV export (params, filename, blob errors) |
| `dashboard-and-risks.test.tsx` | dashboard panels from the payload · 30 s polling config · refresh button · risk ordering/links · empty state · "View all" lazy-loads the register · capped-rule warning |
| `vendor-quotation.test.tsx` | record / edit / clear a quotation · float-safe validation · notes & contacted date preserved · regression for the "Mark confirmed erases data" bug |

These prove logic and wiring. They cannot judge layout or looks — use E2E §9 for that.

To refresh the fixtures after changing the seed: re-run `seed-reports.ts`, then dump the report payloads again (they are
plain `JSON.stringify` of the `get*Report` / `getAdminDashboardSummary` / `getRiskIndicators` results with page size 5).
