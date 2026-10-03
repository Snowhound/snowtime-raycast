import type { Entry, Project } from "../api/types";
import { detectTicket } from "./tickets";

// Start Timer's rows (docs/architecture/README.md, "Starting and continuing").

export interface Suggestion {
  entry: Entry;
  // The entry's project if the organization still lists it as active; an archived or
  // deleted one can't take a new timer, so the suggestion starts without it.
  project: Project | null;
}

// One suggestion per description, ticket, and project, at its newest entry. `entries` come
// newest first, as the API sends them.
export function suggestionsFrom(entries: Entry[], projects: Project[]) {
  const active = new Map(projects.map((project) => [project.id, project]));
  const seen = new Set<string>();
  const suggestions: Suggestion[] = [];
  for (const entry of entries) {
    const project = (entry.projectId && active.get(entry.projectId)) || null;
    const key = JSON.stringify([entry.description, entry.ticket, project?.id ?? null]);
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ entry, project });
  }
  return suggestions;
}

// Whether typed text finds a suggestion by its description, ticket, or project.
export function matches({ entry, project }: Suggestion, text: string) {
  const query = text.trim().toLowerCase();
  return [entry.description, entry.ticket, project?.name].some((value) => value?.toLowerCase().includes(query));
}

// The New timer row's description and ticket: a ticket key in the typed text, as the form
// finds it on submit.
export function newTimerFrom(text: string) {
  return detectTicket(text, new Set(), null);
}
