// The shapes of Snowtime's /api/v1 answers (docs/api.md in the Snowtime repository).
// Timestamps are ISO 8601 strings in UTC.

export type Role = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Me {
  user: User;
  organizations: Organization[];
}

// A project as the running timer carries it.
export interface Project {
  id: string;
  name: string;
  color: string | null;
}

// A project as GET /api/v1/organizations/:orgId/projects lists it.
export interface ListedProject extends Project {
  archivedAt: string | null;
  teamIds: string[];
  hasEntries: boolean;
}

// A running entry has `stoppedAt: null`.
export interface Entry {
  id: string;
  organizationId: string;
  userId: string;
  projectId: string | null;
  description: string;
  ticket: string | null;
  startedAt: string;
  stoppedAt: string | null;
}

// The running timer, as GET /api/v1/timer answers it.
export interface RunningEntry extends Entry {
  project: Project | null;
}

export interface StartInput {
  id: string;
  description?: string;
  ticket?: string | null;
  projectId?: string | null;
}

// `stopped` is the entry the start stopped, null when none ran or when a retry can't tell.
export interface Started {
  started: Entry;
  stopped: Entry | null;
}

export interface EntriesQuery {
  from: Date;
  to: Date;
  userId?: string;
}
