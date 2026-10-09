import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Days are the Mac's days, so the formatting tests run in a zone with a daylight saving
// change: Europe/Tallinn leaves summer time on 25 October 2026.
process.env.TZ = "Europe/Tallinn";

export default defineConfig({
  // Outside Raycast, @raycast/api is the stand-in in src/test/. @raycast/utils is inlined, so
  // its own imports of @raycast/api reach the stand-in too.
  resolve: { alias: { "@raycast/api": fileURLToPath(new URL("src/test/raycast-api.tsx", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["vitest.setup.ts"],
    server: { deps: { inline: ["@raycast/utils"] } },
  },
});
