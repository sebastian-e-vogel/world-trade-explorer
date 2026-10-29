import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["src/**/*.test.ts", "server/**/*.test.ts"], maxWorkers: 1 },
});
