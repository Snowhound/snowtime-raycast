// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import Command from "./stop-timer";
import { at, raycast, useCommandTest } from "./test/render";

const snowtime = useCommandTest({ name: "stop-timer", mode: "no-view" });

function cachedTimer() {
  const value = raycast.cache.get("running-timer");
  return value === undefined ? undefined : JSON.parse(value).timer;
}

describe("Stop Timer", () => {
  test("stops the running timer and says how long it ran", async () => {
    snowtime().seedWeek();
    await Command();
    expect(snowtime().running()).toBeNull();
    expect(raycast.huds).toEqual(["Stopped “Landing page hero” at 1:37"]);
    expect(raycast.closed).toBe(true);
  });

  test("clears the menu bar's timer and refreshes it", async () => {
    snowtime().seedWeek();
    await Command();
    expect(cachedTimer()).toBeNull();
    expect(raycast.launched.at(-1)).toEqual({
      name: "running-timer",
      type: "background",
      context: { fromCache: true },
    });
  });

  test("names a timer without a description by its ticket", async () => {
    snowtime().entry({ ticket: "WEB-15", startedAt: at(0, 10) });
    await Command();
    expect(raycast.huds).toEqual(["Stopped WEB-15 at 0:42"]);
  });

  test("says when no timer runs", async () => {
    await Command();
    expect(raycast.huds).toEqual(["No timer is running"]);
    expect(cachedTimer()).toBeNull();
  });

  test("says the timer already stopped when it stopped in between", async () => {
    snowtime().seedWeek();
    snowtime().answerNext({ status: 404, body: { error: { code: "NOT_FOUND", key: "timer_not_running" } } }, /stop$/);
    await Command();
    expect(raycast.huds).toEqual(["The timer already stopped"]);
    // The menu bar shows whatever runs now.
    expect(cachedTimer()).toMatchObject({ description: "Landing page hero" });
  });

  test("puts the menu bar's timer back and shows the failure when the stop fails", async () => {
    const week = snowtime().seedWeek();
    raycast.cache.set("running-timer", JSON.stringify({ timer: { ...week.running, project: null } }));
    snowtime().answerNext("offline", /stop$/);
    await Command();

    expect(snowtime().running()?.id).toBe(week.running.id);
    expect(cachedTimer()).toMatchObject({ id: week.running.id });
    expect(raycast.toasts.at(-1)).toMatchObject({
      title: "Couldn't stop timer",
      message: "Can't reach snowtime.example.com.",
      primaryAction: { title: "Open Extension Preferences" },
    });
    expect(raycast.closed).toBe(false);
  });

  test("offers the organization's settings to a read-only key", async () => {
    snowtime().seedWeek();
    snowtime().answerNext(
      { status: 403, body: { error: { code: "FORBIDDEN", message: "API key is read-only." } } },
      /stop$/,
    );
    await Command();
    const toast = raycast.toasts.at(-1);
    expect(toast).toMatchObject({ title: "Couldn't stop timer", primaryAction: { title: "Open Snowtime Settings" } });
    toast?.primaryAction?.onAction();
    expect(raycast.opened).toEqual(["https://snowtime.example.com/northwind/settings"]);
  });
});
