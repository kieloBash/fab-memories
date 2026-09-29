// e2e/auth.setup.ts
//
// Signs in once per role THROUGH THE REAL LOGIN PAGES and saves each browser session to
// e2e/.auth/<role>.json. Every spec then starts already signed in as the role it needs.
// This file doubles as TC-FR02-01 evidence for the staff and client login forms.
import { setupClerkTestingToken } from "@clerk/testing/playwright"
import { expect, test as setup } from "@playwright/test"
import { CREDENTIALS, HOME, storageStatePath, type Role } from "./support/env"
import { signInThroughForm } from "./support/session"

const roles: Role[] = ["admin", "coordinator", "coordinator2", "client", "client2"]

for (const role of roles) {
  setup(`sign in as ${role}`, async ({ page }) => {
    await setupClerkTestingToken({ page })
    await signInThroughForm(page, CREDENTIALS[role])
    await expect(page).toHaveURL(new RegExp(`${HOME[role]}(/|$|\\?)`))
    await page.context().storageState({ path: storageStatePath(role) })
  })
}
