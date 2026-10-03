import { expect, test } from "vitest";
import { newEntryId } from "./ids";

test("newEntryId is a UUID v7, and a later one sorts after", () => {
  const first = newEntryId();
  const second = newEntryId();
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(second > first).toBe(true);
});
