import { expect, test } from "vitest";
import type { Entry } from "../api/types";
import { continueNote } from "./continue";

// The tests run in Europe/Tallinn (vitest.config.mts).
const now = new Date(2026, 9, 5, 10, 42);
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).toISOString();

function entry(fields: Partial<Entry>): Entry {
  return {
    id: "entry",
    organizationId: "org",
    userId: "user",
    projectId: null,
    description: "Landing page hero",
    ticket: "WEB-12",
    startedAt: at(5, 9, 5),
    stoppedAt: null,
    ...fields,
  };
}

test("names the running entry and says starting splits it", () => {
  expect(continueNote(entry({}), now)).toBe(
    "Continues “Landing page hero” (running since 9:05 AM). Starting stops it and starts a new entry.",
  );
});

test("names the newest entry by its day and time", () => {
  const triage = { description: "Inbox triage", startedAt: at(4, 16, 30), stoppedAt: at(4, 16, 55) };
  expect(continueNote(entry(triage), now)).toBe("Continues “Inbox triage” from yesterday, 4:30 PM.");
  expect(continueNote(entry({ ...triage, startedAt: at(1, 9), stoppedAt: at(1, 10) }), now)).toBe(
    "Continues “Inbox triage” from Thursday, Oct 1, 9:00 AM.",
  );
});

test("asks for a description when the entry has none", () => {
  expect(
    continueNote(entry({ description: "", ticket: "WEB-15", startedAt: at(4, 8), stoppedAt: at(4, 8, 40) }), now),
  ).toBe("Continues WEB-15 from yesterday, 8:00 AM. It has no description; add one or leave it empty.");
  expect(continueNote(entry({ description: "", ticket: null, startedAt: at(4, 8), stoppedAt: at(4, 9) }), now)).toBe(
    "Continues an entry from yesterday, 8:00 AM. It has no description; add one or leave it empty.",
  );
});

test("says when there is nothing to continue", () => {
  expect(continueNote(null)).toBe("Nothing to continue yet, so this starts a new timer.");
});
