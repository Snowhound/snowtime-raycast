import type { Entry } from "../api/types";
import { hudName } from "./entries";
import { formatDay, formatTime } from "./format";

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
