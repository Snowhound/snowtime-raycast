// Times, days, and durations in en-US, in the Mac's time zone and in 12- or 24-hour time as
// the Time Format preference chooses (docs/architecture/README.md, "Language and formats"). The API doesn't send the
// user's Snowtime time zone, so a day is the Mac's day.

import type { HourCycle } from "./clock";
import { preferredHourCycle } from "./time-format";

const MINUTE = 60_000;

const timeFormats = new Map<HourCycle, Intl.DateTimeFormat>();
const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

// "9:30 AM", or "09:30" in 24-hour time.
export function formatTime(iso: string, hourCycle = preferredHourCycle()) {
  let format = timeFormats.get(hourCycle);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hourCycle });
    timeFormats.set(hourCycle, format);
  }
  return format.format(new Date(iso));
}

// "Today", "Yesterday", or "Monday, Oct 5".
export function formatDay(iso: string, now = new Date()) {
  const days = daysBetween(new Date(iso), now);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return dayFormat.format(new Date(iso));
}

// A span of time as h:mm, counting whole minutes, as the menu bar shows it.
export function formatClock(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / MINUTE));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

// An entry's tracked time; a running one counts up to `now`.
export function formatDuration(entry: { startedAt: string; stoppedAt: string | null }, now = new Date()) {
  const end = entry.stoppedAt ? new Date(entry.stoppedAt) : now;
  return formatClock(end.getTime() - new Date(entry.startedAt).getTime());
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// The last `days` days up to the end of today, for GET /api/v1/orgs/:orgId/entries. Days
// are calendar days, so a day with a daylight saving change still starts at midnight.
export function lastDays(days: number, now = new Date()) {
  const today = startOfDay(now);
  return {
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1)),
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  };
}

// Calendar days from `date` back to `now`: 0 on the same day, 1 for yesterday.
function daysBetween(date: Date, now: Date) {
  const a = startOfDay(date);
  const b = startOfDay(now);
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
      86_400_000,
  );
}
