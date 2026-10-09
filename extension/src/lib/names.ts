// How the extension puts entries and messages into words: an entry's name, the HUDs after a
// start or stop, and Continue Timer's note (docs/architecture/README.md, "Language and
// formats").

import type { Entry } from "../api/types";
import { formatDay, formatDuration, formatTime } from "./format";

interface Named {
  description: string;
  ticket: string | null;
}

// As Snowtime's entryLabel names it: the description, else the ticket, else a stand-in.
export function entryLabel(entry: Named) {
  return entry.description || entry.ticket || "No description";
}

// The entry in a HUD: its description in quotes, a bare ticket as is, or null when it has
// neither, so the HUD says "a timer" or "the timer" instead.
export function hudName(entry: Named) {
  if (entry.description) return `“${entry.description}”`;
  return entry.ticket || null;
}

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

// The note above Continue Timer's form: which entry it continues, from the timer-form
// prototype's Continue states.
export function continueNote(entry: Entry | null, now = new Date()) {
  if (!entry) return "Nothing to continue yet, so this starts a new timer.";
  const name = hudName(entry) ?? "an entry";
  const noDescription = entry.description ? "" : " It has no description; add one or leave it empty.";
  if (entry.stoppedAt === null) {
    return `Continues ${name} (running since ${formatTime(entry.startedAt)}). Starting stops it and starts a new entry.${noDescription}`;
  }
  return `Continues ${name} from ${dayName(entry.startedAt, now)}, ${formatTime(entry.startedAt)}.${noDescription}`;
}

// "today" and "yesterday" in a sentence; other days keep their capitals.
function dayName(iso: string, now: Date) {
  const day = formatDay(iso, now);
  return day === "Today" || day === "Yesterday" ? day.toLowerCase() : day;
}

// A message as a title, which Raycast shows without a closing period: "Invalid API key".
export function asTitle(message: string) {
  return message.replace(/\.$/, "");
}
