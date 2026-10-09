// A fake Snowtime for the command tests: an in-memory instance that answers the calls of
// /api/v1 the extension makes, shaped as docs/api.md in the Snowtime repository says. Tests
// install it as `fetch`, set up its data, and read what the extension asked of it.

import type { Entry, ListedProject, Organization, User } from "../api";

export const INSTANCE = "https://snowtime.example.com";

// Every test reads the same moment: Monday 5 October 2026, 10:42 in Tallinn, as the
// prototypes do.
export const NOW = new Date("2026-10-05T07:42:00.000Z");

// A local time `days` days before NOW, as an ISO string.
export function at(days: number, hours: number, minutes = 0) {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
export const API_KEY = "snow_test";

export const user: User = { id: "user-noah", name: "Noah Berg", email: "noah@example.com" };

export const orgs = {
  harbor: { id: "org-harbor", name: "Harbor Consulting", slug: "harbor", role: "member" },
  northwind: { id: "org-northwind", name: "Northwind Studio", slug: "northwind", role: "member" },
} satisfies Record<string, Organization>;

function project(id: string, name: string, color: string, organizationId: string, archived = false) {
  return {
    id,
    name,
    color,
    archivedAt: archived ? "2026-09-01T00:00:00.000Z" : null,
    teamIds: [],
    hasEntries: true,
    organizationId,
  };
}

export const projects = {
  website: project("project-website", "Website redesign", "#3b82f6", orgs.northwind.id),
  internal: project("project-internal", "Internal", "#9ca3af", orgs.northwind.id),
  legacy: project("project-legacy", "Legacy site", "#f97316", orgs.northwind.id, true),
  audit: project("project-audit", "Audit", "#10b981", orgs.harbor.id),
};

type StoredProject = (typeof projects)[keyof typeof projects];

interface Request {
  method: string;
  path: string;
  body?: unknown;
}

// An answer the next request gets instead of the instance's own: a status and body, or
// `"offline"` for no answer at all.
type Override = { status: number; body: unknown; headers?: Record<string, string> } | "offline";

let sequence = 0;

export function createSnowtime() {
  const state = {
    organizations: [orgs.harbor, orgs.northwind] as Organization[],
    projects: Object.values(projects) as StoredProject[],
    entries: [] as Entry[],
    requests: [] as Request[],
    overrides: [] as { path?: RegExp; answer: Override }[],
  };

  function entry(fields: Partial<Entry> & { startedAt: string }): Entry {
    const added: Entry = {
      id: `entry-${++sequence}`,
      organizationId: orgs.northwind.id,
      userId: user.id,
      projectId: null,
      description: "",
      ticket: null,
      stoppedAt: null,
      ...fields,
    };
    state.entries.push(added);
    return added;
  }

  function running() {
    return state.entries.find((e) => e.stoppedAt === null && e.userId === user.id) ?? null;
  }

  function withProject(e: Entry) {
    const p = state.projects.find((p) => p.id === e.projectId);
    return { ...e, project: p ? { id: p.id, name: p.name, color: p.color } : null };
  }

  function listed(p: StoredProject): ListedProject {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizationId, ...rest } = p;
    return rest;
  }

  function json(status: number, body: unknown, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    });
  }

  function refusal(status: number, code: string, key: string) {
    return json(status, { error: { code, key } });
  }

  function answer(method: string, path: string, body: Record<string, unknown> | undefined): Response {
    const url = new URL(path, INSTANCE);
    let match: RegExpExecArray | null;

    if (method === "GET" && url.pathname === "/api/v1/me") {
      const organizations = [...state.organizations].sort((a, b) => a.name.localeCompare(b.name));
      return json(200, { user, organizations });
    }
    if (method === "GET" && url.pathname === "/api/v1/timer") {
      const timer = running();
      return json(200, timer && withProject(timer));
    }
    if (method === "POST" && url.pathname === "/api/v1/timer/stop") {
      const timer = running();
      if (!timer || timer.id !== body?.id) return refusal(404, "NOT_FOUND", "timer_not_running");
      timer.stoppedAt = new Date().toISOString();
      return json(200, timer);
    }
    if ((match = /^\/api\/v1\/organizations\/([^/]+)\/(.+)$/.exec(url.pathname))) {
      const [, orgId, rest] = match;
      if (!state.organizations.some((org) => org.id === orgId)) {
        return refusal(403, "FORBIDDEN", "not_organization_member");
      }
      if (method === "GET" && rest === "projects") {
        return json(200, state.projects.filter((p) => p.organizationId === orgId && !p.archivedAt).map(listed));
      }
      if (method === "GET" && rest === "entries") {
        const from = new Date(url.searchParams.get("from") ?? 0).getTime();
        const to = new Date(url.searchParams.get("to") ?? 8.64e15).getTime();
        const userId = url.searchParams.get("userId");
        const found = state.entries
          .filter((e) => e.organizationId === orgId && (!userId || e.userId === userId))
          .filter((e) => new Date(e.startedAt).getTime() >= from && new Date(e.startedAt).getTime() < to)
          .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        return json(200, found);
      }
      if (method === "POST" && rest === "timer/start") {
        const projectId = (body?.projectId as string | null | undefined) ?? null;
        const p = state.projects.find((p) => p.id === projectId);
        if (projectId && (!p || p.organizationId !== orgId)) return refusal(404, "NOT_FOUND", "project_not_found");
        if (p?.archivedAt) return refusal(409, "CONFLICT", "project_archived");
        if (state.entries.some((e) => e.id === body?.id)) return refusal(409, "CONFLICT", "entry_id_taken");
        const before = running();
        const now = new Date().toISOString();
        if (before) before.stoppedAt = now;
        const started = entry({
          id: body?.id as string,
          organizationId: orgId,
          projectId,
          description: (body?.description as string | undefined) ?? "",
          ticket: (body?.ticket as string | null | undefined) ?? null,
          startedAt: now,
        });
        return json(201, { started, stopped: before });
      }
    }
    return json(404, { error: { code: "NOT_FOUND", message: `No route for ${method} ${url.pathname}.` } });
  }

  const fetch = async (input: string | URL | globalThis.Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const path = `${url.pathname}${url.search}`;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    state.requests.push({ method, path: url.pathname, body });

    const index = state.overrides.findIndex((o) => !o.path || o.path.test(url.pathname));
    if (index !== -1) {
      const [{ answer: override }] = state.overrides.splice(index, 1);
      if (override === "offline") throw new TypeError("fetch failed");
      return json(override.status, override.body, override.headers);
    }
    if (url.origin !== INSTANCE) throw new TypeError("fetch failed");
    if (new Headers(init?.headers).get("authorization") !== `Bearer ${API_KEY}`) {
      return json(401, { error: { code: "UNAUTHORIZED", message: "Invalid API key." } });
    }
    return answer(method, path, body);
  };

  // A week in Northwind, as the prototypes show it: a running timer since 9:05 today, a
  // stand-up before it, yesterday's work, and older entries outside the default range.
  function seedWeek() {
    const { website, internal, legacy } = projects;
    return {
      running: entry({
        description: "Landing page hero",
        ticket: "WEB-12",
        projectId: website.id,
        startedAt: at(0, 9, 5),
      }),
      standup: entry({ description: "Standup", projectId: internal.id, startedAt: at(0, 8, 45), stoppedAt: at(0, 9) }),
      triage: entry({
        description: "Inbox triage",
        ticket: "OPS-7",
        projectId: internal.id,
        startedAt: at(1, 16, 30),
        stoppedAt: at(1, 17, 10),
      }),
      triageMorning: entry({
        description: "Inbox triage",
        ticket: "OPS-7",
        projectId: internal.id,
        startedAt: at(1, 9),
        stoppedAt: at(1, 9, 30),
      }),
      heroYesterday: entry({
        description: "Hero copy",
        ticket: "WEB-12",
        projectId: website.id,
        startedAt: at(1, 11),
        stoppedAt: at(1, 12, 15),
      }),
      legacy: entry({ description: "Old footer", projectId: legacy.id, startedAt: at(4, 14), stoppedAt: at(4, 15) }),
      report: entry({ description: "Quarterly report", startedAt: at(6, 10), stoppedAt: at(6, 12) }),
      audit: entry({
        description: "Audit prep",
        organizationId: orgs.harbor.id,
        projectId: projects.audit.id,
        startedAt: at(2, 13),
        stoppedAt: at(2, 14),
      }),
    };
  }

  return {
    fetch,
    state,
    entry,
    seedWeek,
    running,
    // The next request, or the next to a path matching `path`, gets `answer` instead.
    answerNext(answer: Override, path?: RegExp) {
      state.overrides.push({ path, answer });
    },
    // The requests made, as "GET /api/v1/timer".
    calls() {
      return state.requests.map((r) => `${r.method} ${r.path}`);
    },
  };
}

export type Snowtime = ReturnType<typeof createSnowtime>;
