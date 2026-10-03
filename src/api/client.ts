import { ApiError, NO_ANSWER } from "./errors";
import type { Entry, EntriesQuery, Me, Project, RunningEntry, StartInput, Started } from "./types";

export interface ClientConfig {
  instanceUrl: string;
  apiKey: string;
}

// A request that waits longer than this counts as unanswered.
const TIMEOUT_MS = 15_000;

// The host the user typed, for "Can't reach <host>."
export function hostOf(instanceUrl: string) {
  try {
    return new URL(instanceUrl.trim()).host || instanceUrl.trim();
  } catch {
    return instanceUrl.trim();
  }
}

export function baseUrl(instanceUrl: string) {
  return `${instanceUrl.trim().replace(/\/+$/, "")}/api/v1`;
}

export function createClient(config: ClientConfig, fetchFn: typeof fetch = fetch) {
  const base = baseUrl(config.instanceUrl);

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await fetchFn(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.apiKey.trim()}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ApiError(null, NO_ANSWER, `Can't reach ${hostOf(config.instanceUrl)}.`, method);
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) throw failure(response, data, method);
    return data as T;
  }

  async function timer() {
    return (await request<{ timer: RunningEntry | null }>("GET", "/timer")).timer;
  }

  return {
    me: () => request<Me>("GET", "/me"),

    timer,

    // Starts a timer, stopping the running one first. A start that gets no answer is sent
    // once more with the same id. A 409 on that retry may mean the first one started, so the
    // running timer decides (docs/architecture/README.md, "Starting a timer").
    async startTimer(orgId: string, input: StartInput): Promise<Started> {
      const path = `/orgs/${encodeURIComponent(orgId)}/timer`;
      try {
        return await request<Started>("POST", path, input);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== NO_ANSWER) throw error;
      }
      try {
        return await request<Started>("POST", path, input);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 409) throw error;
        const running = await timer();
        if (running?.id !== input.id) throw error;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { project, ...started } = running;
        return { started, stopped: null };
      }
    },

    stopTimer: async (entryId: string) =>
      (await request<{ stopped: Entry }>("POST", `/timer/${encodeURIComponent(entryId)}/stop`)).stopped,

    projects: async (orgId: string) =>
      (await request<{ projects: Project[] }>("GET", `/orgs/${encodeURIComponent(orgId)}/projects`)).projects,

    async entries(orgId: string, query: EntriesQuery) {
      const params = new URLSearchParams({ from: query.from.toISOString(), to: query.to.toISOString() });
      if (query.userId) params.set("userId", query.userId);
      const path = `/orgs/${encodeURIComponent(orgId)}/entries?${params}`;
      return (await request<{ entries: Entry[] }>("GET", path)).entries;
    },
  };
}

export type Client = ReturnType<typeof createClient>;

// The API answers `{ "error": { "code", "message" } }`; a proxy in between may answer
// anything, so a body without it still becomes an ApiError.
function failure(response: Response, data: unknown, method: string) {
  const error = (data as { error?: { code?: unknown; message?: unknown } } | null)?.error;
  const code = typeof error?.code === "string" ? error.code : `HTTP_${response.status}`;
  const message =
    typeof error?.message === "string" && error.message
      ? error.message
      : `Snowtime answered ${response.status} ${response.statusText}`.trim() + ".";
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  return new ApiError(response.status, code, message, method, Number.isFinite(retryAfter) ? retryAfter : null);
}
