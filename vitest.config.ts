// vitest.config.ts — UI component tests for Module 8 (see test-harness/ui/README.md)
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["./test-harness/ui/setup.ts"],
    include: ["test-harness/ui/**/*.test.tsx"],
    testTimeout: 15_000,
  },
})
