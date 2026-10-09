import { vi } from "vitest";

// The tests expect 12-hour times, whatever the machine running them is set to, and run
// outside Raycast, which holds the preference.
vi.mock("./src/lib/time-format", () => ({ preferredHourCycle: () => "h12" }));
