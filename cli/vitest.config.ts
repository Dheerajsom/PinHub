import { defineConfig } from "vitest/config";

// Keep the CLI suite self-contained. Without a local config Vitest searches
// upward and can load the website's config in clean CLI-only CI installs.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
