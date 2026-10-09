import { describe, expect, test } from "vitest";
import type { Entry } from "../api/types";
import { groupByDay, matches, mergeByTicket, newTimerFrom, rowsFrom, suggestionsFrom, totalOf } from "./rows";

const website = { id: "website", name: "Website redesign", color: "#3b82b8" };
const internal = { id: "internal", name: "Internal", color: null };

let n = 0;
function entry(
  description: string,
  ticket: string | null,
  projectId: string | null,
  fields: Partial<Entry> = {},
): Entry {
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
    ...fields,
  };
}

describe("rowsFrom", () => {
  test("keeps every entry, repeats included, with its project", () => {
    const entries = [entry("Inbox triage", "OPS-7", "internal"), entry("Inbox triage", "OPS-7", "internal")];
    expect(rowsFrom(entries, [internal])).toEqual(entries.map((e) => ({ entry: e, project: internal })));
  });

  test("leaves out an archived project", () => {
    const archived = entry("Old work", null, "archived");
    expect(rowsFrom([archived], [website])).toEqual([{ entry: archived, project: null }]);
  });
});

describe("suggestionsFrom", () => {
  test("keeps one per description, ticket, and project, at its newest entry", () => {
    const entries = [
      entry("Inbox triage", "OPS-7", "internal"),
      entry("Landing page hero", "WEB-12", "website"),
      entry("Inbox triage", "OPS-7", "internal"),
      entry("Inbox triage", "OPS-7", null),
      entry("Inbox triage", null, "internal"),
    ];
    const suggestions = suggestionsFrom(entries, [internal, website]);
    expect(suggestions.map((s) => s.entry)).toEqual([entries[0], entries[1], entries[3], entries[4]]);
    expect(suggestions[0].project).toBe(internal);
  });

  test("treats an archived project as none", () => {
    const entries = [entry("Old work", null, "archived"), entry("Old work", null, null)];
    expect(suggestionsFrom(entries, [website])).toEqual([{ entry: entries[0], project: null }]);
  });
});

test("matches finds a row by description, ticket, or project", () => {
  const row = { entry: entry("Inbox triage", "OPS-7", "internal"), project: internal };
  expect(matches(row, "inbox")).toBe(true);
  expect(matches(row, "ops-7")).toBe(true);
  expect(matches(row, "Intern")).toBe(true);
  expect(matches(row, "landing")).toBe(false);
});

// The tests run in Europe/Tallinn (vitest.config.mts).
describe("groupByDay and totalOf", () => {
  const now = new Date(2026, 9, 5, 10, 42);
  const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).toISOString();
  const running = { entry: entry("Hero", null, null, { startedAt: at(5, 9, 5) }), project: null };
  const standup = {
    entry: entry("Standup", null, null, { startedAt: at(5, 8, 45), stoppedAt: at(5, 9) }),
    project: null,
  };
  const triage = {
    entry: entry("Triage", null, null, { startedAt: at(4, 16, 30), stoppedAt: at(4, 16, 55) }),
    project: null,
  };

  test("groups rows under their day, newest first", () => {
    expect(groupByDay([running, standup, triage], now)).toEqual([
      { title: "Today", rows: [running, standup] },
      { title: "Yesterday", rows: [triage] },
    ]);
  });

  test("totals a day, counting a running entry up to now", () => {
    expect(totalOf([running, standup], now)).toBe("1:52");
    expect(totalOf([triage], now)).toBe("0:25");
  });
});

test("newTimerFrom splits a ticket key off the start of the text", () => {
  expect(newTimerFrom("OPS-9 Budget review")).toEqual({ description: "Budget review", ticket: "OPS-9" });
  expect(newTimerFrom("Quarterly report")).toEqual({ description: "Quarterly report", ticket: null });
});

describe("mergeByTicket", () => {
  const row = (description: string, ticket: string | null) => ({
    entry: entry(description, ticket, null),
    project: null,
  });
  const hero = row("Landing page hero", "WEB-12");
  const standup = row("Standup", null);
  const review = row("Hero image review", "WEB-12");
  const standupAgain = row("Standup", null);
  const triage = row("Inbox triage", "OPS-7");

  test("keeps every row its own when off", () => {
    expect(mergeByTicket([hero, standup, review], false)).toEqual([[hero], [standup], [review]]);
  });

  test("groups rows with one ticket at the place of the newest", () => {
    expect(mergeByTicket([hero, standup, review, triage], true)).toEqual([[hero, review], [standup], [triage]]);
  });

  test("never merges rows without a ticket", () => {
    expect(mergeByTicket([standup, standupAgain], true)).toEqual([[standup], [standupAgain]]);
  });
});
