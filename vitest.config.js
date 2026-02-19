import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/ui/**"],
    },
  },
});
