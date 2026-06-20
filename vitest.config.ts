import { defineConfig } from "vitest/config";

// Standalone test config — intentionally does NOT extend the app's vite.config
// (which loads browser-only plugins). Tests target server-side modules.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
  },
});
