import { Cache, environment, launchCommand, LaunchType } from "@raycast/api";
import type { RunningEntry } from "../api/types";
import { nextRun } from "./menu";

// The running timer as the commands last saw it, for the menu bar's background runs
// (docs/architecture/README.md, "The menu bar").

const cache = new Cache();
const TIMER = "running-timer";
const MENU_BAR = "running-timer";

// The cached timer: null when none runs, undefined when nothing is cached.
export function cachedTimer(): RunningEntry | null | undefined {
  const value = cache.get(TIMER);
  return value === undefined ? undefined : (JSON.parse(value) as { timer: RunningEntry | null }).timer;
}

export function cacheTimer(timer: RunningEntry | null) {
  cache.set(TIMER, JSON.stringify({ timer }));
}

// What a command tells the menu bar when it refreshes it.
export interface MenuBarContext {
  // Show the cache without reading the API: the command has just written it, maybe before
  // its request finished, and an API read in between could bring back the old timer.
  fromCache?: boolean;
}

// Runs the menu bar in the background so it shows the cache at once. It fails when the user
// has disabled the menu bar, which needs nothing more. From the menu bar itself it does
// nothing: launching the command that is running replaces it, ending the action midway
// ("Worker exited"), and the open menu updates its own state.
export async function refreshMenuBar() {
  if (environment.commandName === MENU_BAR) return;
  const context: MenuBarContext = { fromCache: true };
  try {
    await launchCommand({ name: MENU_BAR, type: LaunchType.Background, context });
  } catch {
    // The menu bar is off.
  }
}

const RUNS = "background-runs";

// Counts a background run in the cache; answers whether this run reads the API.
export function countBackgroundRun() {
  const { count, readsApi } = nextRun(Number(cache.get(RUNS)) || 0);
  cache.set(RUNS, String(count));
  return readsApi;
}
