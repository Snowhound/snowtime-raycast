import { Cache, environment, launchCommand, LaunchType } from "@raycast/api";
import { ApiError } from "../api/errors";
import type { RunningEntry } from "../api/types";
import { nextRun } from "../lib/menu";

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

// The last failure the menu bar met, kept until the API answers again, so a run that only
// shows the cache still shows it (docs/architecture/README.md, "The menu bar"). With it, the
// time of the last answer, which says how old the cached timer is.
const FAILURE = "last-failure";
const ANSWERED_AT = "last-answer";

interface SavedFailure {
  status: number | null;
  code: string;
  message: string;
  method: string;
}

// The API answered: the failure, if any, is over.
export function noteAnswer() {
  cache.remove(FAILURE);
  cache.set(ANSWERED_AT, new Date().toISOString());
}

export function noteFailure(error: unknown) {
  const failure: SavedFailure =
    error instanceof ApiError
      ? { status: error.status, code: error.code, message: error.message, method: error.method }
      : {
          status: null,
          code: "UNKNOWN",
          message: error instanceof Error ? error.message : String(error),
          method: "GET",
        };
  cache.set(FAILURE, JSON.stringify(failure));
}

export function savedFailure(): ApiError | undefined {
  const value = cache.get(FAILURE);
  if (value === undefined) return undefined;
  const { status, code, message, method } = JSON.parse(value) as SavedFailure;
  return new ApiError(status, code, message, method);
}

// When the API last answered, as an ISO string; undefined before the first answer.
export function lastAnswerAt() {
  return cache.get(ANSWERED_AT);
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
