import { expect, test } from "vitest";
import type { Entry } from "../api/types";
import { startedHud, stoppedHud } from "./hud";

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
