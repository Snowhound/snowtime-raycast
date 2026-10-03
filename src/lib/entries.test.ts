import { expect, test } from "vitest";
import { entryLabel, hudName } from "./entries";

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
