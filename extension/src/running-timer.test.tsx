// @vitest-environment happy-dom
import type { LaunchProps } from "@raycast/api";
import { describe, expect, test } from "vitest";
import type { RunningEntry } from "./api";
import Command from "./running-timer";
import { environment } from "./test/raycast-api";
import { raycast, renderCommand, runAction, screen, settled, useCommandTest, waitFor, within } from "./test/render";
import { projects } from "./test/snowtime";

const snowtime = useCommandTest({ name: "running-timer", mode: "menu-bar" });

type Props = LaunchProps<{ launchContext: { fromCache?: boolean } }>;

// Runs the menu bar as Raycast does: in the background on its minute ticks, or as the
// user's own run when the menu opens.
async function run({ background = false, fromCache = false } = {}) {
  environment.launchType = background ? "background" : "userInitiated";
  const props = { launchContext: fromCache ? { fromCache } : undefined } as unknown as Props;
  const view = renderCommand(<Command {...props} />);
  await settled();
  return view;
}

function menu() {
  return document.querySelector<HTMLElement>('[data-view="menu-bar"]')!;
}

function lines() {
  return [...menu().querySelectorAll("p, button")].map((line) => line.textContent);
}

function cache(timer: RunningEntry | null) {
  raycast.cache.set("running-timer", JSON.stringify({ timer }));
}

function cachedTimer() {
  return JSON.parse(raycast.cache.get("running-timer") ?? "{}").timer;
}

describe("the title", () => {
  test("is the running timer's elapsed time", async () => {
    snowtime().seedWeek();
    await run();
    expect(menu().dataset.title).toBe("1:37");
    expect(menu().title).toBe("Landing page hero · 1:37");
  });

  test("is empty when no timer runs", async () => {
    await run();
    expect(menu().dataset.title).toBe("");
    expect(menu().title).toBe("No timer running");
    expect(lines()).toContain("No timer running");
  });
});

describe("the menu", () => {
  test("shows the running entry with its project, ticket, and start, and Stop Timer", async () => {
    snowtime().seedWeek();
    await run();
    expect(lines().slice(0, 4)).toEqual([
      "Landing page hero",
      "Website redesign · WEB-12",
      "Since 9:05 AM",
      "Stop Timer",
    ]);
  });

  test("lists five recent entries to start again, leaving out the running one", async () => {
    snowtime().seedWeek();
    await run();
    const section = within(menu()).getByRole("group", { name: "Start Again" });
    const items = within(section).getAllByRole("button");
    expect(items.map((item) => item.textContent)).toEqual([
      "Standup",
      "Inbox triage",
      "Hero copy",
      "Old footer",
      "Quarterly report",
    ]);
    expect(items.map((item) => item.dataset.shortcut)).toEqual(["cmd+1", "cmd+2", "cmd+3", "cmd+4", "cmd+5"]);
  });

  test("leaves out Start Again when Show Start Again is off, and doesn't read the entries", async () => {
    snowtime().seedWeek();
    raycast.preferences.showStartAgain = false;
    await run();
    expect(within(menu()).queryByRole("group", { name: "Start Again" })).toBeNull();
    expect(snowtime().calls()).toEqual(["GET /api/v1/timer"]);
  });

  test("opens the other commands", async () => {
    await run();
    await runAction(menu(), "Start Timer…");
    await runAction(menu(), "Continue Timer…");
    await runAction(menu(), "Recent Entries…");
    expect(raycast.launched.map((l) => l.name)).toEqual(["start-timer", "continue-timer", "recent-entries"]);
  });
});

describe("reading the API", () => {
  test("happens when nothing is cached, and caches the timer", async () => {
    snowtime().seedWeek();
    await run();
    expect(snowtime().calls()).toContain("GET /api/v1/timer");
    expect(cachedTimer()).toMatchObject({ description: "Landing page hero", project: { id: projects.website.id } });
  });

  test("doesn't happen when the menu opens with a timer cached", async () => {
    const week = snowtime().seedWeek();
    cache({ ...week.running, project: null });
    await run();
    expect(snowtime().calls()).toEqual([]);
    expect(menu().dataset.title).toBe("1:37");
  });

  test("doesn't happen when another command refreshes the menu bar from the cache", async () => {
    cache(null);
    await run({ background: true, fromCache: true });
    expect(snowtime().calls()).toEqual([]);
  });

  test("happens every fifth background run", async () => {
    snowtime().seedWeek();
    cache(null);
    for (let n = 1; n <= 4; n++) {
      const view = await run({ background: true });
      view.unmount();
    }
    expect(snowtime().calls()).toEqual([]);
    await run({ background: true });
    expect(snowtime().calls()).toContain("GET /api/v1/timer");
    expect(menu().dataset.title).toBe("1:37");
  });

  test("happens on Refresh, which shows the result at once", async () => {
    cache(null);
    await run();
    snowtime().seedWeek();
    await runAction(menu(), "Refresh");
    await waitFor(() => expect(cachedTimer()).toMatchObject({ description: "Landing page hero" }));
  });
});

describe("actions", () => {
  test("Stop Timer stops the timer and the menu shows none", async () => {
    snowtime().seedWeek();
    await run();
    await runAction(menu(), "Stop Timer");
    await settled();
    expect(snowtime().running()).toBeNull();
    expect(menu().dataset.title).toBe("");
    expect(raycast.huds).toEqual(["Stopped “Landing page hero” at 1:37"]);
    // The menu shows the change itself: a command can't launch itself.
    expect(raycast.launched).toEqual([]);
  });

  test("Start Again starts the entry and the menu shows it", async () => {
    snowtime().seedWeek();
    await run();
    await runAction(within(menu()).getByRole("group", { name: "Start Again" }), "Hero copy");
    await settled();
    expect(snowtime().running()).toMatchObject({ description: "Hero copy", ticket: "WEB-12" });
    expect(menu().dataset.title).toBe("0:00");
  });

  test("a failed action shows its failure as a HUD, since the menu has no window", async () => {
    snowtime().seedWeek();
    await run();
    snowtime().answerNext("offline", /stop$/);
    await runAction(menu(), "Stop Timer");
    await settled();
    expect(raycast.huds).toEqual(["Couldn't stop timer: Can't reach snowtime.example.com."]);
    expect(menu().dataset.title).toBe("1:37");
  });
});

describe("a failed read", () => {
  test("says the key is invalid", async () => {
    raycast.preferences.apiKey = "snow_wrong";
    await run();
    expect(lines().slice(0, 2)).toEqual(["Invalid API key", "Check it under Configure Extension."]);
  });

  test("says the instance can't be reached, and shows the last known timer", async () => {
    const week = snowtime().seedWeek();
    cache({ ...week.running, project: null });
    snowtime().answerNext("offline");
    snowtime().answerNext("offline");
    await run();
    await runAction(menu(), "Refresh");
    await settled();
    expect(screen.getByText("Can't reach snowtime.example.com")).toBeDefined();
    expect(screen.getByText("Showing the last known timer.")).toBeDefined();
    expect(menu().dataset.title).toBe("1:37");
  });
});
