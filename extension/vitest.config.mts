import { defineConfig } from "vitest/config";

// Days are the Mac's days, so the formatting tests run in a zone with a daylight saving
// change: Europe/Tallinn leaves summer time on 25 October 2026.
process.env.TZ = "Europe/Tallinn";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"], setupFiles: ["vitest.setup.ts"] },
});
