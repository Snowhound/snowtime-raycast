import { ApiError, messageOfKey, NO_ANSWER } from "./errors";
import type { Entry, EntriesQuery, ListedProject, Me, RunningEntry, StartInput, Started } from "./types";

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

// The instance's address without a trailing slash, for its pages.
export function siteUrl(instanceUrl: string) {
  return instanceUrl.trim().replace(/\/+$/, "");
}

export function baseUrl(instanceUrl: string) {
  return `${siteUrl(instanceUrl)}/api/v1`;
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

  function timer() {
    return request<RunningEntry | null>("GET", "/timer");
  }

  function organizationPath(orgId: string) {
    return `/organizations/${encodeURIComponent(orgId)}`;
  }

  return {
    me: () => request<Me>("GET", "/me"),

    timer,

    // Starts a timer, stopping the running one first. A start that gets no answer is sent
    // once more with the same id. A 409 on that retry may mean the first one started, so the
    // running timer decides (docs/architecture/README.md, "Starting a timer").
    async startTimer(orgId: string, input: StartInput): Promise<Started> {
      const path = `${organizationPath(orgId)}/timer/start`;
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

    // Stops the running timer only if it is this entry; otherwise answers 404.
    stopTimer: (entryId: string) => request<Entry>("POST", "/timer/stop", { id: entryId }),

    projects: (orgId: string) => request<ListedProject[]>("GET", `${organizationPath(orgId)}/projects`),

    entries(orgId: string, query: EntriesQuery) {
      const params = new URLSearchParams({ from: query.from.toISOString(), to: query.to.toISOString() });
      if (query.userId) params.set("userId", query.userId);
      return request<Entry[]>("GET", `${organizationPath(orgId)}/entries?${params}`);
    },
  };
}

export type Client = ReturnType<typeof createClient>;

// The API answers `{ "error": { "code", "key" } }` for a refusal of its rules, and
// `{ "error": { "code"?, "message" } }` otherwise; a proxy in between may answer anything,
// so a body without either still becomes an ApiError.
function failure(response: Response, data: unknown, method: string) {
  const error = (data as { error?: { code?: unknown; key?: unknown; message?: unknown } } | null)?.error;
  const code = typeof error?.code === "string" ? error.code : `HTTP_${response.status}`;
  const key = typeof error?.key === "string" ? error.key : null;
  const message =
    (key && messageOfKey(key)) ||
    (typeof error?.message === "string" && error.message) ||
    `Snowtime answered ${response.status} ${response.statusText}`.trim() + ".";
  const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  return new ApiError(response.status, code, message, method, Number.isFinite(retryAfter) ? retryAfter : null, key);
}
