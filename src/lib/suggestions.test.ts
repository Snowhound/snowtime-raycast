import { describe, expect, test } from "vitest";
import type { Entry } from "../api/types";
import { matches, newTimerFrom, suggestionsFrom } from "./suggestions";

const website = { id: "website", name: "Website redesign", color: "#3b82b8" };
const internal = { id: "internal", name: "Internal", color: null };

let n = 0;
function entry(description: string, ticket: string | null, projectId: string | null): Entry {
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

describe("suggestionsFrom", () => {
  test("keeps one per description, ticket, and project, at its newest entry", () => {
    const newest = entry("Inbox triage", "OPS-7", "internal");
    const entries = [
      newest,
      entry("Landing page hero", "WEB-12", "website"),
      entry("Inbox triage", "OPS-7", "internal"),
      entry("Inbox triage", "OPS-7", null),
      entry("Inbox triage", null, "internal"),
    ];
    const suggestions = suggestionsFrom(entries, [internal, website]);
    expect(suggestions.map((s) => s.entry.id)).toEqual(["entry-1", "entry-2", "entry-4", "entry-5"]);
    expect(suggestions[0]).toEqual({ entry: newest, project: internal });
  });

  test("starts an entry of an archived project without it", () => {
    const archived = entry("Old work", null, "archived");
    expect(suggestionsFrom([archived], [website])).toEqual([{ entry: archived, project: null }]);
  });
});

test("matches finds a suggestion by description, ticket, or project", () => {
  const suggestion = { entry: entry("Inbox triage", "OPS-7", "internal"), project: internal };
  expect(matches(suggestion, "inbox")).toBe(true);
  expect(matches(suggestion, "ops-7")).toBe(true);
  expect(matches(suggestion, "Intern")).toBe(true);
  expect(matches(suggestion, "landing")).toBe(false);
});

test("newTimerFrom splits a ticket key off the start of the text", () => {
  expect(newTimerFrom("OPS-9 Budget review")).toEqual({ description: "Budget review", ticket: "OPS-9" });
  expect(newTimerFrom("Quarterly report")).toEqual({ description: "Quarterly report", ticket: null });
});
