import type { Entry } from "../api/types";
import { hudName } from "./entries";
import { formatDuration } from "./format";

// The HUD after a start: "Started “Inbox triage” on OPS-7", "Started WEB-15", or "Started a
// timer", and the entry it stopped, with its duration.
export function startedHud(started: Entry, stopped: Entry | null) {
  const name = hudName(started);
  const title = `Started ${name && started.description && started.ticket ? `${name} on ${started.ticket}` : (name ?? "a timer")}`;
  if (!stopped) return title;
  const duration = formatDuration(stopped);
  if (sameWork(started, stopped)) return `${title} again and stopped the previous entry at ${duration}`;
  return `${title} and stopped ${hudName(stopped) ?? "the running timer"} at ${duration}`;
}

// "Stopped “Landing page hero” at 1:37", "Stopped WEB-12 at 1:37", or "Stopped the timer at 1:37".
export function stoppedHud(stopped: Entry) {
  return `Stopped ${hudName(stopped) ?? "the timer"} at ${formatDuration(stopped)}`;
}

function sameWork(a: Entry, b: Entry) {
  return a.description === b.description && a.ticket === b.ticket && a.projectId === b.projectId;
}
