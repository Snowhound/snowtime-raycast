import { describe, expect, test, vi } from "vitest";
import { baseUrl, createClient } from "./client";
import { ApiError, NO_ANSWER } from "./errors";

const entry = {
  id: "01920000-0000-7000-8000-000000000501",
  organizationId: "01920000-0000-7000-8000-000000000201",
  userId: "01920000-0000-7000-8000-000000000104",
  projectId: null,
  description: "Landing page",
  ticket: "WEB-12",
  startedAt: "2026-10-03T07:05:03.642Z",
  stoppedAt: null,
};

function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

function refusal(status: number, code: string, message: string, headers?: Record<string, string>) {
  return json(status, { error: { code, message } }, headers);
}

// A fetch that answers each call with the next of `answers`; an Error is no answer.
function fake(...answers: (Response | Error)[]) {
  return vi.fn<typeof fetch>(async () => {
    const answer = answers.shift();
    if (!answer) throw new Error("No more answers");
    if (answer instanceof Error) throw answer;
    return answer;
  });
}

function client(fetchFn: typeof fetch, instanceUrl = "https://snowtime.example.com") {
  return createClient({ instanceUrl, apiKey: "snow_secret" }, fetchFn);
}

async function failureOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe("requests", () => {
  test("go to /api/v1 of the instance with the key", async () => {
    const fetchFn = fake(json(200, { user: {}, organizations: [] }));
    await client(fetchFn).me();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://snowtime.example.com/api/v1/me");
    expect(init?.method).toBe("GET");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer snow_secret");
  });

  test("tolerate a trailing slash in the instance URL", () => {
    expect(baseUrl("https://snowtime.example.com/")).toBe("https://snowtime.example.com/api/v1");
    expect(baseUrl(" http://localhost:3000// ")).toBe("http://localhost:3000/api/v1");
  });

  test("send a write's input as JSON", async () => {
    const fetchFn = fake(json(200, { started: entry, stopped: null }));
    await client(fetchFn).startTimer("org 1", { id: entry.id, description: "Landing page" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://snowtime.example.com/api/v1/orgs/org%201/timer");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(init?.body as string)).toEqual({ id: entry.id, description: "Landing page" });
  });

  test("send a range as ISO 8601 query parameters", async () => {
    const fetchFn = fake(json(200, { entries: [entry] }));
    const entries = await client(fetchFn).entries("org-1", {
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-02T00:00:00Z"),
      userId: "user-1",
    });
    expect(entries).toEqual([entry]);
    const url = new URL(fetchFn.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/v1/orgs/org-1/entries");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-02T00:00:00.000Z",
      userId: "user-1",
    });
  });

  test("unwrap each answer", async () => {
    const project = { id: "project-1", name: "Website redesign", color: null };
    expect(await client(fake(json(200, { timer: null }))).timer()).toBeNull();
    expect(await client(fake(json(200, { timer: { ...entry, project } }))).timer()).toEqual({ ...entry, project });
    expect(await client(fake(json(200, { projects: [project] }))).projects("org-1")).toEqual([project]);

    const stop = fake(json(200, { stopped: entry }));
    expect(await client(stop).stopTimer(entry.id)).toEqual(entry);
    expect(stop.mock.calls[0][0]).toBe(`https://snowtime.example.com/api/v1/timer/${entry.id}/stop`);
    expect(stop.mock.calls[0][1]?.body).toBeUndefined();
  });
});

describe("errors", () => {
  test.each([
    [401, "UNAUTHENTICATED", "Invalid API key."],
    [403, "FORBIDDEN", "API key is read-only."],
    [404, "NOT_FOUND", "Entry not found."],
    [409, "CONFLICT", "Project is archived."],
    [422, "INVALID", "Description is too long."],
    [422, "LIMIT_REACHED", "Too many entries."],
    [500, "INTERNAL", "Something went wrong."],
    [503, "UNAVAILABLE", "Snowtime is unavailable."],
  ])("%i %s keeps the status, code, and message", async (status, code, message) => {
    const error = await failureOf(client(fake(refusal(status, code, message))).stopTimer(entry.id));
    expect(error).toMatchObject({ status, code, message, method: "POST", retryAfter: null });
  });

  test("429 keeps the wait Retry-After gives", async () => {
    const answer = refusal(429, "RATE_LIMITED", "Too many requests.", { "retry-after": "5" });
    const error = await failureOf(client(fake(answer)).timer());
    expect(error).toMatchObject({ status: 429, code: "RATE_LIMITED", method: "GET", retryAfter: 5 });
  });

  test("an answer without the API's error body still fails with its status", async () => {
    const answer = new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" });
    const error = await failureOf(client(fake(answer)).me());
    expect(error).toMatchObject({ status: 502, code: "HTTP_502", message: "Snowtime answered 502 Bad Gateway." });
  });

  test("no answer names the host", async () => {
    const error = await failureOf(client(fake(new TypeError("fetch failed")), "https://snowtime.example.com/").me());
    expect(error).toMatchObject({ status: null, code: NO_ANSWER, message: "Can't reach snowtime.example.com." });
  });

  test("an instance URL that isn't a URL is no answer too", async () => {
    const error = await failureOf(client(fetch, "snowtime example").me());
    expect(error).toMatchObject({ code: NO_ANSWER, message: "Can't reach snowtime example." });
  });
});

describe("starting a timer", () => {
  const input = { id: entry.id, description: "Landing page", ticket: "WEB-12" };

  test("retries once with the same id when it gets no answer", async () => {
    const fetchFn = fake(new TypeError("fetch failed"), json(200, { started: entry, stopped: null }));
    expect(await client(fetchFn).startTimer("org-1", input)).toEqual({ started: entry, stopped: null });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1][1]?.body).toBe(fetchFn.mock.calls[0][1]?.body);
  });

  test("doesn't retry an answered failure", async () => {
    const fetchFn = fake(refusal(409, "CONFLICT", "Project is archived."));
    const error = await failureOf(client(fetchFn).startTimer("org-1", input));
    expect(error.status).toBe(409);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test("fails when the retry gets no answer either", async () => {
    const fetchFn = fake(new TypeError("fetch failed"), new TypeError("fetch failed"));
    const error = await failureOf(client(fetchFn).startTimer("org-1", input));
    expect(error.code).toBe(NO_ANSWER);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test("a 409 on the retry counts as started when that id is running", async () => {
    const project = { id: "project-1", name: "Website redesign", color: null };
    const fetchFn = fake(
      new TypeError("fetch failed"),
      refusal(409, "CONFLICT", "Entry already exists."),
      json(200, { timer: { ...entry, project } }),
    );
    expect(await client(fetchFn).startTimer("org-1", input)).toEqual({ started: entry, stopped: null });
    expect(fetchFn.mock.calls[2][0]).toBe("https://snowtime.example.com/api/v1/timer");
  });

  test("a 409 on the retry fails when another timer is running", async () => {
    const fetchFn = fake(
      new TypeError("fetch failed"),
      refusal(409, "CONFLICT", "Another timer started at the same moment."),
      json(200, { timer: { ...entry, id: "01920000-0000-7000-8000-000000000999", project: null } }),
    );
    const error = await failureOf(client(fetchFn).startTimer("org-1", input));
    expect(error).toMatchObject({ status: 409, message: "Another timer started at the same moment." });
  });

  test("a 409 on the retry fails when no timer is running", async () => {
    const fetchFn = fake(
      new TypeError("fetch failed"),
      refusal(409, "CONFLICT", "Entry already exists."),
      json(200, { timer: null }),
    );
    expect((await failureOf(client(fetchFn).startTimer("org-1", input))).status).toBe(409);
  });
});
