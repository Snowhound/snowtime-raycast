import { describe, expect, test } from "vitest";
import { formatClock, formatDay, formatDuration, formatTime, lastDays } from "./format";

// The tests run in Europe/Tallinn (vitest.config.ts): UTC+3 in summer, UTC+2 in winter.
const now = new Date(2026, 9, 5, 10, 42); // Monday 5 October 2026, 10:42

test("formatTime is en-US in the Mac's zone", () => {
  expect(formatTime("2026-10-05T06:05:00.000Z")).toBe("9:05 AM");
  expect(formatTime("2026-10-05T12:30:00.000Z")).toBe("3:30 PM");
});

describe("formatDay", () => {
  test("names today and yesterday, and other days by weekday and date", () => {
    expect(formatDay("2026-10-05T06:00:00.000Z", now)).toBe("Today");
    expect(formatDay("2026-10-04T06:00:00.000Z", now)).toBe("Yesterday");
    expect(formatDay("2026-10-01T06:00:00.000Z", now)).toBe("Thursday, Oct 1");
  });

  test("a day starts at the Mac's midnight, not UTC's", () => {
    // 23:30 UTC on 4 October is 02:30 on 5 October in Tallinn.
    expect(formatDay("2026-10-04T23:30:00.000Z", now)).toBe("Today");
    // 20:59 UTC on 4 October is 23:59 on 4 October in Tallinn.
    expect(formatDay("2026-10-04T20:59:00.000Z", now)).toBe("Yesterday");
  });

  test("counts calendar days across a daylight saving change", () => {
    const afterChange = new Date(2026, 9, 26, 0, 30); // Monday 26 October, after 25 October's change
    expect(formatDay(new Date(2026, 9, 25, 23, 59).toISOString(), afterChange)).toBe("Yesterday");
    expect(formatDay(new Date(2026, 9, 24, 12, 0).toISOString(), afterChange)).toBe("Saturday, Oct 24");
  });
});

test("formatClock is h:mm of whole minutes", () => {
  expect(formatClock(0)).toBe("0:00");
  expect(formatClock(59_999)).toBe("0:00");
  expect(formatClock(97 * 60_000)).toBe("1:37");
  expect(formatClock(24 * 3_600_000)).toBe("24:00");
  expect(formatClock(-5_000)).toBe("0:00");
});

test("formatDuration counts a running entry up to now", () => {
  expect(formatDuration({ startedAt: "2026-10-05T06:05:00.000Z", stoppedAt: null }, now)).toBe("1:37");
  expect(formatDuration({ startedAt: "2026-10-05T05:45:00.000Z", stoppedAt: "2026-10-05T06:00:00.000Z" })).toBe("0:15");
});

describe("lastDays", () => {
  test("runs from the start of the first day to the end of today", () => {
    expect(lastDays(2, now)).toEqual({ from: new Date(2026, 9, 4), to: new Date(2026, 9, 6) });
    expect(lastDays(14, now).from).toEqual(new Date(2026, 8, 22));
  });

  test("starts each day at local midnight across a daylight saving change", () => {
    const { from, to } = lastDays(7, new Date(2026, 9, 27, 9, 0));
    expect(from.toISOString()).toBe("2026-10-20T21:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-27T22:00:00.000Z");
  });
});
