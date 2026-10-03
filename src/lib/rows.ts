import type { Entry, Project } from "../api/types";
import { formatClock, formatDay } from "./format";
import { detectTicket } from "./tickets";

// The rows of Start Timer and Recent Entries (docs/architecture/README.md, "Starting and
// continuing").

export interface EntryRow {
  entry: Entry;
  // The entry's project if the organization still lists it as active. An archived or
  // deleted one can't take a new timer, so the row starts without it.
  project: Project | null;
}

// Every entry with its active project. `entries` come newest first, as the API sends them.
export function rowsFrom(entries: Entry[], projects: Project[]): EntryRow[] {
  const active = new Map(projects.map((project) => [project.id, project]));
  return entries.map((entry) => ({ entry, project: (entry.projectId && active.get(entry.projectId)) || null }));
}

// Start Timer's suggestions: one row per description, ticket, and project, at its newest
// entry.
export function suggestionsFrom(entries: Entry[], projects: Project[]) {
  const seen = new Set<string>();
  return rowsFrom(entries, projects).filter(({ entry, project }) => {
    const key = JSON.stringify([entry.description, entry.ticket, project?.id ?? null]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Whether typed text finds a row by its description, ticket, or project.
export function matches({ entry, project }: EntryRow, text: string) {
  const query = text.trim().toLowerCase();
  return [entry.description, entry.ticket, project?.name].some((value) => value?.toLowerCase().includes(query));
}

// Rows under their day's title, newest day first, as "Today", "Yesterday", or "Monday, Oct 5".
export function groupByDay<T extends EntryRow>(rows: T[], now = new Date()) {
  const days = new Map<string, T[]>();
  for (const row of rows) {
    const title = formatDay(row.entry.startedAt, now);
    days.set(title, [...(days.get(title) ?? []), row]);
  }
  return [...days].map(([title, rows]) => ({ title, rows }));
}

// A day's rows as groups that each take one row in Recent Entries: every row its own, or,
// with `merge`, one group per ticket at the place of its newest entry. A row without a ticket
// always stays its own (docs/architecture/README.md, "Sign-in and
// preferences").
export function mergeByTicket<T extends EntryRow>(rows: T[], merge: boolean) {
  if (!merge) return rows.map((row) => [row]);
  const groups: T[][] = [];
  const byTicket = new Map<string, T[]>();
  for (const row of rows) {
    const ticket = row.entry.ticket;
    const group = ticket ? byTicket.get(ticket) : undefined;
    if (group) {
      group.push(row);
      continue;
    }
    const created = [row];
    if (ticket) byTicket.set(ticket, created);
    groups.push(created);
  }
  return groups;
}

// The time the rows tracked, as h:mm; a running entry counts up to `now`.
export function totalOf(rows: EntryRow[], now = new Date()) {
  const ms = rows.reduce((sum, { entry }) => {
    const end = entry.stoppedAt ? new Date(entry.stoppedAt) : now;
    return sum + Math.max(0, end.getTime() - new Date(entry.startedAt).getTime());
  }, 0);
  return formatClock(ms);
}

// The New timer row's description and ticket: a ticket key in the typed text, as the form
// finds it on submit.
export function newTimerFrom(text: string) {
  return detectTicket(text, new Set(), null);
}
