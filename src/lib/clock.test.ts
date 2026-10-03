import { expect, test } from "vitest";
import { hourCycleFor } from "./clock";

test("hourCycleFor takes 12 or 24 hours as chosen", () => {
  expect(hourCycleFor("12-hour", "en-GB")).toBe("h12");
  expect(hourCycleFor("24-hour", "en-US")).toBe("h23");
});

test("hourCycleFor's System Default follows the locale", () => {
  expect(hourCycleFor("system", "en-US")).toBe("h12");
  expect(hourCycleFor("system", "en-GB")).toBe("h23");
  expect(hourCycleFor("system", "et-EE")).toBe("h23");
});
