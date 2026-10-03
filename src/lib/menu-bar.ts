import { Cache, launchCommand, LaunchType } from "@raycast/api";
import type { RunningEntry } from "../api/types";

// The running timer as the commands last saw it, for the menu bar's background runs
// (docs/architecture/README.md, "The menu bar").

const cache = new Cache();
const TIMER = "running-timer";

// The cached timer: null when none runs, undefined when nothing is cached.
export function cachedTimer(): RunningEntry | null | undefined {
  const value = cache.get(TIMER);
  return value === undefined ? undefined : (JSON.parse(value) as { timer: RunningEntry | null }).timer;
}

export function cacheTimer(timer: RunningEntry | null) {
  cache.set(TIMER, JSON.stringify({ timer }));
}

// Runs the menu bar in the background so it shows the cache at once. It fails when the user
// has disabled the menu bar, which needs nothing more.
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "running-timer", type: LaunchType.Background });
  } catch {
    // The menu bar is off.
  }
}
