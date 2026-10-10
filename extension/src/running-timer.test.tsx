// @vitest-environment happy-dom
import type { LaunchProps } from "@raycast/api";
import { describe, expect, test, vi } from "vitest";
import type { RunningEntry } from "./api";
import Command from "./running-timer";
import { environment } from "./test/raycast-api";
import { raycast, renderCommand, runAction, screen, settled, useCommandTest, waitFor, within } from "./test/render";
import { NOW, orgs, projects } from "./test/snowtime";
import { startTimer } from "./timer/start";

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

describe("a kept failure", () => {
  // The timer is read at 10:37, and Refresh at 10:42 gets no answer.
  async function failRefreshAfterARead() {
    vi.setSystemTime(new Date(NOW.getTime() - 5 * 60_000));
    snowtime().seedWeek();
    const first = await run();
    first.unmount();
    vi.setSystemTime(NOW);
    const view = await run();
    snowtime().answerNext("offline");
    snowtime().answerNext("offline");
    await runAction(menu(), "Refresh");
    await settled();
    view.unmount();
  }

  test("shows when the menu opens again, with the time of the last read", async () => {
    await failRefreshAfterARead();
    const calls = snowtime().calls().length;
    await run();
    expect(lines().slice(0, 2)).toEqual(["Can't reach snowtime.example.com", "Showing the timer as of 10:37 AM."]);
    expect(menu().dataset.title).toBe("1:37");
    // Opening the menu still sends nothing.
    expect(snowtime().calls().length).toBe(calls);
  });

  test("puts a badge on the menu bar's mark, and the title stays the elapsed time", async () => {
    await failRefreshAfterARead();
    await run();
    expect(menu().dataset.icon).toBe("menu-bar-icon-error.png");
    expect(menu().dataset.title).toBe("1:37");
  });

  test("shows in background runs between reads", async () => {
    await failRefreshAfterARead();
    await run({ background: true });
    expect(lines()[0]).toBe("Can't reach snowtime.example.com");
  });

  test("goes away with the next answer", async () => {
    await failRefreshAfterARead();
    const view = await run();
    await runAction(menu(), "Refresh");
    await settled();
    view.unmount();
    await run();
    expect(lines()[0]).toBe("Landing page hero");
    expect(menu().dataset.icon).toBe("menu-bar-icon.png");
  });

  test("goes away when another command starts a timer", async () => {
    await failRefreshAfterARead();
    environment.entryPointMode = "view";
    await startTimer(orgs.northwind, { description: "Budget review", ticket: null, project: null });
    environment.entryPointMode = "menu-bar";
    await run();
    expect(lines()[0]).toBe("Budget review");
  });

  test("isn't made by another command's failure, which shows in its own window", async () => {
    snowtime().seedWeek();
    environment.entryPointMode = "view";
    snowtime().answerNext("offline");
    snowtime().answerNext("offline");
    await startTimer(orgs.northwind, { description: "Budget review", ticket: null, project: null });
    environment.entryPointMode = "menu-bar";
    await run();
    expect(lines()[0]).toBe("Landing page hero");
  });

  test("is made by the menu's own failed Stop Timer", async () => {
    snowtime().seedWeek();
    const view = await run();
    snowtime().answerNext("offline", /stop$/);
    await runAction(menu(), "Stop Timer");
    await settled();
    view.unmount();
    await run();
    expect(lines()[0]).toBe("Can't reach snowtime.example.com");
  });
});

describe("the error line", () => {
  test("tries again when clicked, and the menu shows the answer", async () => {
    snowtime().seedWeek();
    snowtime().answerNext("offline");
    snowtime().answerNext("offline");
    await run();
    expect(lines()[0]).toBe("Can't reach snowtime.example.com");
    const line = within(menu()).getByRole("button", { name: "Can't reach snowtime.example.com" });
    await runAction(menu(), line.textContent ?? "");
    await settled();
    expect(lines()[0]).toBe("Landing page hero");
  });

  test("opens the preferences for an invalid key", async () => {
    raycast.preferences.apiKey = "snow_wrong";
    await run();
    await runAction(menu(), "Invalid API key");
    expect(raycast.preferencesOpened).toBe(1);
  });
});
