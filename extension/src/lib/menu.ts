import { ApiError, NO_ANSWER } from "../api/errors";
import type { Entry, Project } from "../api/types";
import { formatTime } from "./format";
import { asTitle } from "./names";
import { suggestionsFrom } from "./rows";

// What Running Timer shows, apart from Raycast (docs/architecture/README.md, "The menu bar").

// Background runs between reads of the API: Raycast runs the menu bar once a minute, and
// every fifth run reads the API, so a timer started elsewhere shows within 5 minutes.
export const API_EVERY = 5;

// The count after one more background run, and whether that run reads the API.
export function nextRun(count: number) {
  const next = (count + 1) % API_EVERY;
  return { count: next, readsApi: next === 0 };
}

// The menu's Start Again section: up to five entries, one per description, ticket, and
// project, leaving out the running one.
export function startAgainFrom(entries: Entry[], projects: Project[], running: Entry | null) {
  const runningKey = running && [running.description, running.ticket, running.projectId].join("\u0000");
  return suggestionsFrom(entries, projects)
    .filter(
      ({ entry, project }) => [entry.description, entry.ticket, project?.id ?? null].join("\u0000") !== runningKey,
    )
    .slice(0, 5);
}

// The menu's lines for a failed read: what failed, and what to do or what it shows instead,
// with the time the cached timer was last read. `fix` is what the error line does when
// clicked: open the preferences for an invalid key, else try again.
export function menuError(
  error: Error,
  host: string,
  { hasCachedTimer, answeredAt }: { hasCachedTimer: boolean; answeredAt?: string },
) {
  const fallback = hasCachedTimer
    ? answeredAt
      ? `Showing the timer as of ${formatTime(answeredAt)}.`
      : "Showing the last known timer."
    : undefined;
  if (error instanceof ApiError && error.status === 401) {
    return {
      title: asTitle(error.message),
      detail: "Check it under Configure Extension.",
      fix: "preferences" as const,
    };
  }
  if (error instanceof ApiError && error.code === NO_ANSWER) {
    return {
      title: `Can't reach ${host}`,
      detail: fallback ?? "Check your connection or the instance URL.",
      fix: "refresh" as const,
    };
  }
  return { title: asTitle(error.message), detail: fallback ?? "Refresh to try again.", fix: "refresh" as const };
}
