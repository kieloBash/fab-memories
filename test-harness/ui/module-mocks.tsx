// test-harness/ui/module-mocks.tsx  — imported for its vi.mock side effects
import { vi } from "vitest"

vi.mock("@/lib/axios", async () => {
  const { mockApi } = await import("./utils")
  const actual = await vi.importActual<typeof import("@/lib/axios")>("@/lib/axios")
  return { ...actual, default: mockApi, api: mockApi }
})
vi.mock("sonner", async () => {
  const { toastMock } = await import("./utils")
  return { toast: toastMock, Toaster: () => null }
})
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock("next/navigation", async () => {
  const { routerMock } = await import("./utils")
  return {
  useRouter: () => routerMock,
  notFound: () => { throw new Error("NEXT_NOT_FOUND") },
  usePathname: () => "/",
  }
})
