import { describe, expect, test } from "vitest";
import type { Entry } from "../api/types";
import { asTitle, continueNote, entryLabel, hudName, startedHud, stoppedHud } from "./names";

test("entryLabel names an entry by its description, else its ticket, else a stand-in", () => {
  expect(entryLabel({ description: "Inbox triage", ticket: "OPS-7" })).toBe("Inbox triage");
  expect(entryLabel({ description: "", ticket: "WEB-15" })).toBe("WEB-15");
  expect(entryLabel({ description: "", ticket: null })).toBe("No description");
});

test("hudName quotes a description, names a bare ticket, and is null for neither", () => {
  expect(hudName({ description: "Inbox triage", ticket: "OPS-7" })).toBe("“Inbox triage”");
  expect(hudName({ description: "", ticket: "WEB-15" })).toBe("WEB-15");
  expect(hudName({ description: "", ticket: null })).toBeNull();
});

function entry(fields: Partial<Entry>): Entry {
  return {
    id: "entry",
    organizationId: "org",
    userId: "user",
    projectId: null,
    description: "",
    ticket: null,
    startedAt: "2026-10-05T06:05:00.000Z",
    stoppedAt: null,
    ...fields,
  };
}

const running = entry({ description: "Landing page hero", ticket: "WEB-12", projectId: "website" });
const stopped = { ...running, stoppedAt: "2026-10-05T07:42:00.000Z" };

test("startedHud names the entry: description and ticket, a bare ticket, or neither", () => {
  expect(startedHud(entry({ description: "Inbox triage", ticket: "OPS-7" }), null)).toBe(
    "Started “Inbox triage” on OPS-7",
  );
  expect(startedHud(entry({ description: "Inbox triage" }), null)).toBe("Started “Inbox triage”");
  expect(startedHud(entry({ ticket: "WEB-15" }), null)).toBe("Started WEB-15");
  expect(startedHud(entry({}), null)).toBe("Started a timer");
});

test("startedHud names the entry it stopped, with its duration", () => {
  expect(startedHud(entry({ description: "Inbox triage", ticket: "OPS-7" }), stopped)).toBe(
    "Started “Inbox triage” on OPS-7 and stopped “Landing page hero” at 1:37",
  );
  expect(startedHud(entry({ description: "Inbox triage" }), { ...stopped, description: "" })).toBe(
    "Started “Inbox triage” and stopped WEB-12 at 1:37",
  );
  expect(startedHud(entry({ description: "Inbox triage" }), { ...stopped, description: "", ticket: null })).toBe(
    "Started “Inbox triage” and stopped the running timer at 1:37",
  );
});

test("startedHud says when the same work starts again", () => {
  expect(startedHud({ ...running, id: "new" }, stopped)).toBe(
    "Started “Landing page hero” on WEB-12 again and stopped the previous entry at 1:37",
  );
});

test("stoppedHud names the entry and its duration", () => {
  expect(stoppedHud(stopped)).toBe("Stopped “Landing page hero” at 1:37");
  expect(stoppedHud({ ...stopped, description: "" })).toBe("Stopped WEB-12 at 1:37");
  expect(stoppedHud({ ...stopped, description: "", ticket: null })).toBe("Stopped the timer at 1:37");
});

// The tests run in Europe/Tallinn (vitest.config.mts).
const now = new Date(2026, 9, 5, 10, 42);
const at = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes).toISOString();

// An entry for continueNote, by default the running one.
function continued(fields: Partial<Entry>): Entry {
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

describe("continueNote", () => {
  test("names the running entry and says starting splits it", () => {
    expect(continueNote(continued({}), now)).toBe(
      "Continues “Landing page hero” (running since 9:05 AM). Starting stops it and starts a new entry.",
    );
  });

  test("names the newest entry by its day and time", () => {
    const triage = { description: "Inbox triage", startedAt: at(4, 16, 30), stoppedAt: at(4, 16, 55) };
    expect(continueNote(continued(triage), now)).toBe("Continues “Inbox triage” from yesterday, 4:30 PM.");
    expect(continueNote(continued({ ...triage, startedAt: at(1, 9), stoppedAt: at(1, 10) }), now)).toBe(
      "Continues “Inbox triage” from Thursday, Oct 1, 9:00 AM.",
    );
  });

  test("asks for a description when the entry has none", () => {
    expect(
      continueNote(continued({ description: "", ticket: "WEB-15", startedAt: at(4, 8), stoppedAt: at(4, 8, 40) }), now),
    ).toBe("Continues WEB-15 from yesterday, 8:00 AM. It has no description; add one or leave it empty.");
    expect(
      continueNote(continued({ description: "", ticket: null, startedAt: at(4, 8), stoppedAt: at(4, 9) }), now),
    ).toBe("Continues an entry from yesterday, 8:00 AM. It has no description; add one or leave it empty.");
  });

  test("says when there is nothing to continue", () => {
    expect(continueNote(null)).toBe("Nothing to continue yet, so this starts a new timer.");
  });
});

test("asTitle drops a message's closing period", () => {
  expect(asTitle("Invalid API key.")).toBe("Invalid API key");
  expect(asTitle("Can't reach snowtime.example.com")).toBe("Can't reach snowtime.example.com");
});
