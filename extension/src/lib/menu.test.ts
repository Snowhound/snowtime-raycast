import { describe, expect, test } from "vitest";
import { ApiError, NO_ANSWER } from "../api/errors";
import type { Entry } from "../api/types";
import { menuError, nextRun, startAgainFrom } from "./menu";

test("nextRun reads the API every fifth background run", () => {
  let count = 0;
  const reads: boolean[] = [];
  for (let run = 0; run < 10; run++) {
    const next = nextRun(count);
    count = next.count;
    reads.push(next.readsApi);
  }
  expect(reads).toEqual([false, false, false, false, true, false, false, false, false, true]);
});

let n = 0;
function entry(description: string, ticket: string | null = null, projectId: string | null = null): Entry {
  n++;
  return {
    id: `entry-${n}`,
    organizationId: "org",
    userId: "user",
    projectId,
    description,
    ticket,
    startedAt: new Date(Date.UTC(2026, 9, 5, 12) - n * 3_600_000).toISOString(),
    stoppedAt: null,
  };
}

describe("startAgainFrom", () => {
  test("keeps five, one per description, ticket, and project, without the running one", () => {
    const running = entry("Landing page hero", "WEB-12", "website");
    const entries = [
      running,
      entry("Standup"),
      entry("Landing page hero", "WEB-12", "website"),
      entry("Inbox triage", "OPS-7"),
      entry("Standup"),
      entry("Review"),
      entry("Invoices"),
      entry("Kickoff"),
      entry("Planning"),
    ];
    const website = { id: "website", name: "Website redesign", color: null };
    const found = startAgainFrom(entries, [website], running).map((row) => row.entry.description);
    expect(found).toEqual(["Standup", "Inbox triage", "Review", "Invoices", "Kickoff"]);
  });

  test("keeps the newest five without a running timer", () => {
    const entries = [entry("A"), entry("B")];
    expect(startAgainFrom(entries, [], null).map((row) => row.entry)).toEqual(entries);
  });
});

describe("menuError", () => {
  const host = "snowtime.example.com";

  test("an invalid key points to the preferences", () => {
    const error = new ApiError(401, "UNAUTHENTICATED", "Invalid API key.", "GET");
    expect(menuError(error, host, true)).toEqual({
      title: "Invalid API key",
      detail: "Check it under Configure Extension.",
    });
  });

  test("no connection names the host, and says the cached timer shows", () => {
    const error = new ApiError(null, NO_ANSWER, `Can't reach ${host}.`, "GET");
    expect(menuError(error, host, true)).toEqual({
      title: "Can't reach snowtime.example.com",
      detail: "Showing the last known timer.",
    });
    expect(menuError(error, host, false).detail).toBe("Check your connection or the instance URL.");
  });

  test("any other failure shows the API's message", () => {
    const error = new ApiError(503, "UNAVAILABLE", "Snowtime is unavailable.", "GET");
    expect(menuError(error, host, false)).toEqual({
      title: "Snowtime is unavailable",
      detail: "Refresh to try again.",
    });
  });
});
