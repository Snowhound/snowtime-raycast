// @vitest-environment happy-dom
import type { LaunchProps } from "@raycast/api";
import { describe, expect, test } from "vitest";
import Command from "./start-timer";
import {
  at,
  choose,
  findRow,
  raycast,
  renderCommand,
  runAction,
  screen,
  settled,
  typeSearch,
  useCommandTest,
  waitFor,
  within,
} from "./test/render";
import { orgs, projects } from "./test/snowtime";

const snowtime = useCommandTest({ name: "start-timer" });

function rowTitles() {
  return screen.queryAllByRole("listitem").map((row) => row.getAttribute("aria-label"));
}

function sectionOf(row: HTMLElement) {
  return row.closest('[role="group"]')?.getAttribute("aria-label");
}

type Props = LaunchProps<{ arguments: Arguments.StartTimer }>;

// Start Timer's launch props as Raycast passes them: the Description argument empty unless
// given, and `fallbackText` when it runs as a fallback command.
function launch({ description = "", fallbackText }: { description?: string; fallbackText?: string } = {}) {
  return { arguments: { description }, launchType: "userInitiated", fallbackText } as unknown as Props;
}

async function open(options?: { description?: string; fallbackText?: string }) {
  renderCommand(<Command {...launch(options)} />);
  await settled();
}

describe("suggestions", () => {
  test("are today's and yesterday's entries, one per description, ticket, and project, by day", async () => {
    snowtime().seedWeek();
    await open();
    expect(rowTitles()).toEqual(["Landing page hero", "Standup", "Inbox triage", "Hero copy"]);
    expect(sectionOf(await findRow("Standup"))).toBe("Today");
    expect(sectionOf(await findRow("Hero copy"))).toBe("Yesterday");
  });

  test("reach as far back as Suggestions From says", async () => {
    snowtime().seedWeek();
    raycast.preferences.suggestionRange = "7";
    await open();
    expect(rowTitles()).toContain("Quarterly report");
    expect(rowTitles()).toContain("Old footer");
  });

  test("name an entry without a description by its ticket, which also shows as its tag", async () => {
    snowtime().entry({
      ticket: "TASK-123",
      projectId: projects.website.id,
      startedAt: at(0, 10),
      stoppedAt: at(0, 10, 30),
    });
    await open();
    expect((await findRow("TASK-123")).dataset.accessories).toBe("TASK-123 | 10:00 AM");
  });

  test("show the running entry's elapsed time", async () => {
    snowtime().seedWeek();
    await open();
    expect((await findRow("Landing page hero")).dataset.accessories).toContain("Running 1:37");
  });

  test("are filtered by description, ticket, or project as the user types", async () => {
    snowtime().seedWeek();
    await open();
    await typeSearch("ops-7");
    expect(rowTitles()).toEqual(["Inbox triage", "ops-7"]);
    await typeSearch("website");
    expect(rowTitles()).toEqual(["Landing page hero", "Hero copy", "website"]);
  });
});

describe("starting a suggestion", () => {
  test("starts it at once with its description, ticket, and project", async () => {
    const week = snowtime().seedWeek();
    await open();
    await runAction(await findRow("Inbox triage"), "Start Timer");

    const started = snowtime().running();
    expect(started).toMatchObject({
      description: "Inbox triage",
      ticket: "OPS-7",
      projectId: projects.internal.id,
      organizationId: orgs.northwind.id,
    });
    expect(raycast.huds).toEqual([`Started “Inbox triage” on OPS-7 and stopped “Landing page hero” at 1:37`]);
    expect(raycast.closed).toBe(true);
    expect(snowtime().state.entries.find((e) => e.id === week.running.id)?.stoppedAt).not.toBeNull();
  });

  test("remembers the organization and project, and shows the timer in the menu bar", async () => {
    snowtime().seedWeek();
    await open();
    await runAction(await findRow("Standup"), "Start Timer");

    expect(raycast.localStorage.get("projectId")).toBe(projects.internal.id);
    expect(JSON.parse(raycast.cache.get("running-timer") ?? "{}").timer).toMatchObject({
      description: "Standup",
      project: { id: projects.internal.id },
    });
    expect(raycast.launched).toEqual([{ name: "running-timer", type: "background", context: { fromCache: true } }]);
  });

  test("leaves out a project that has been archived since", async () => {
    snowtime().seedWeek();
    raycast.preferences.suggestionRange = "7";
    await open();
    const row = await findRow("Old footer");
    expect(row.dataset.subtitle).toBe("No project");
    await runAction(row, "Start Timer");
    expect(snowtime().running()).toMatchObject({ description: "Old footer", projectId: null });
  });

  test("shows the failure and keeps the window open when the start fails", async () => {
    snowtime().seedWeek();
    await open();
    snowtime().answerNext({ status: 403, body: { error: { code: "FORBIDDEN", message: "API key is read-only." } } });
    await runAction(await findRow("Standup"), "Start Timer");

    await waitFor(() => expect(raycast.toasts.at(-1)).toMatchObject({ title: "Couldn't start timer" }));
    expect(raycast.toasts.at(-1)).toMatchObject({
      message: "API key is read-only.",
      primaryAction: { title: "Open Snowtime Settings" },
    });
    expect(raycast.closed).toBe(false);
    expect(raycast.cache.get("running-timer")).toBeUndefined();
  });
});

describe("New Timer", () => {
  test("opens the form empty with the remembered project when nothing is typed", async () => {
    snowtime().seedWeek();
    raycast.localStorage.set("projectId", projects.website.id);
    await open();
    await runAction(await findRow("Standup"), "New Timer");

    await settled();
    expect(screen.getByLabelText("Description")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Description").dataset.autofocus).toBe("true");
    await waitFor(() => expect(screen.getByLabelText("Project")).toHaveProperty("value", projects.website.id));
  });

  test("opens the form with the typed text, a leading ticket key split off", async () => {
    snowtime().seedWeek();
    await open();
    await typeSearch("OPS-9 Budget review");
    await runAction(await findRow("Budget review"), "Edit and Start");

    await settled();
    expect(screen.getByLabelText("Description")).toHaveProperty("value", "Budget review");
    expect(screen.getByLabelText("Ticket")).toHaveProperty("value", "OPS-9");
  });

  test("uses the typed text on a suggestion's row too", async () => {
    snowtime().seedWeek();
    await open();
    await typeSearch("inbox");
    const button = within(await findRow("Inbox triage")).getByRole("button", { name: "New Timer" });
    expect(button.dataset.shortcut).toBe("cmd+n");
    await runAction(await findRow("Inbox triage"), "New Timer");

    await settled();
    expect(screen.getByLabelText("Description")).toHaveProperty("value", "inbox");
  });

  test("is the New timer row's own action while typing, in a New section when something matches", async () => {
    snowtime().seedWeek();
    await open();
    await typeSearch("inbox");
    const row = await findRow("inbox");
    expect(row.dataset.subtitle).toBe("New timer");
    expect(sectionOf(row)).toBe("New");
    expect(within(row).getByRole("button", { name: "Edit and Start" }).dataset.shortcut).toBe("cmd+n");

    await typeSearch("Quarterly");
    expect(rowTitles()).toEqual(["Quarterly"]);
    // Typed text never opens the form by itself, only text from root search.
    expect(screen.queryByRole("form")).toBeNull();
  });
});

describe("Stop Timer", () => {
  test("is on every row while a suggestion runs, and stops it", async () => {
    snowtime().seedWeek();
    await open();
    const row = await findRow("Hero copy");
    const section = within(row).getByRole("group", { name: "Running Timer" });
    expect(within(section).getByRole("button", { name: "Stop Timer" }).dataset.shortcut).toBe("cmd+s");

    await runAction(section, "Stop Timer");
    expect(snowtime().running()).toBeNull();
    expect(raycast.huds).toEqual(["Stopped “Landing page hero” at 1:37"]);
  });

  test("is missing when no suggestion runs", async () => {
    const week = snowtime().seedWeek();
    week.running.stoppedAt = week.running.startedAt;
    await open();
    expect(within(await findRow("Standup")).queryByRole("button", { name: "Stop Timer" })).toBeNull();
  });
});

describe("empty and failed lists", () => {
  test("say there are no entries in the range, and offer New Timer", async () => {
    await open();
    const empty = await screen.findByRole("status", { name: "No entries since yesterday" });
    await runAction(empty, "New Timer");
    expect(await screen.findByRole("form", { name: "Start Timer" })).toBeDefined();
  });

  test("say to join an organization when the user has none", async () => {
    snowtime().state.organizations = [];
    await open();
    expect(await screen.findByRole("status", { name: "No organizations" })).toBeDefined();
  });

  test("show an invalid key with Open Extension Preferences", async () => {
    raycast.preferences.apiKey = "snow_wrong";
    await open();
    const view = await screen.findByRole("status", { name: "Invalid API key" });
    await runAction(view, "Open Extension Preferences");
    expect(raycast.preferencesOpened).toBe(1);
    expect(raycast.toasts.at(-1)).toMatchObject({ title: "Couldn't load recent entries" });
  });

  test("show an unreachable instance with Refresh", async () => {
    raycast.preferences.instanceUrl = "https://nowhere.example.com";
    await open();
    const view = await screen.findByRole("status", { name: "Can't reach nowhere.example.com" });
    expect(within(view).getByRole("button", { name: "Refresh" })).toBeDefined();
  });
});

test("the organization picker shows another organization's entries and remembers it", async () => {
  snowtime().seedWeek();
  raycast.preferences.suggestionRange = "7";
  await open();
  await choose("Organization", orgs.harbor.id);
  await waitFor(() => expect(rowTitles()).toEqual(["Audit prep"]));
  expect(raycast.localStorage.get("organizationId")).toBe(orgs.harbor.id);
});

describe("text from root search", () => {
  test("the Description argument opens the list as if typed", async () => {
    snowtime().seedWeek();
    await open({ description: "inbox" });
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "inbox");
    expect(rowTitles()).toEqual(["Inbox triage", "inbox"]);
    await runAction(await findRow("Inbox triage"), "Start Timer");
    expect(snowtime().running()).toMatchObject({ description: "Inbox triage", ticket: "OPS-7" });
  });

  test("without a match opens the timer form in the list's place, the ticket key split off", async () => {
    snowtime().seedWeek();
    await open({ description: "OPS-9 Budget review" });
    const form = await screen.findByRole("form", { name: "Start Timer" });
    expect(within(form).getByLabelText("Description")).toHaveProperty("value", "Budget review");
    expect(within(form).getByLabelText("Ticket")).toHaveProperty("value", "OPS-9");
    expect(screen.queryByRole("searchbox")).toBeNull();

    await runAction(form, "Start Timer");
    expect(snowtime().running()).toMatchObject({ description: "Budget review", ticket: "OPS-9" });
  });

  test("shows an empty, loading list until the fresh suggestions decide, not the cached rows", async () => {
    snowtime().seedWeek();
    const earlier = renderCommand(<Command {...launch()} />);
    await settled();
    earlier.unmount();

    renderCommand(<Command {...launch({ description: "inbox" })} />);
    expect(screen.queryAllByRole("listitem")).toEqual([]);
    expect(document.querySelector('[data-view="list"]')?.getAttribute("aria-busy")).toBe("true");
    expect(await findRow("Inbox triage")).toBeDefined();
  });

  test("is matched against the fresh suggestions, not the cached ones", async () => {
    snowtime().seedWeek();
    // An earlier open caches the suggestions; a matching entry is made in the web app since.
    const earlier = renderCommand(<Command {...launch()} />);
    await settled();
    earlier.unmount();
    snowtime().entry({ description: "Budget review", startedAt: at(0, 10), stoppedAt: at(0, 10, 30) });

    await open({ description: "budget" });
    expect(await findRow("Budget review")).toBeDefined();
    expect(screen.queryByRole("form")).toBeNull();
  });

  test("stays in the list when the suggestions fail to load", async () => {
    snowtime().answerNext("offline", /entries$/);
    await open({ description: "Budget review" });
    expect(await screen.findByRole("status", { name: "Can't reach snowtime.example.com" })).toBeDefined();
    expect(screen.queryByRole("form")).toBeNull();
  });

  test("the root search's text does the same when Start Timer is the fallback", async () => {
    snowtime().seedWeek();
    await open({ fallbackText: "standup" });
    expect(screen.getByRole("searchbox")).toHaveProperty("value", "standup");
    expect(rowTitles()).toEqual(["Standup", "standup"]);
  });

  test("can be changed like typed text", async () => {
    snowtime().seedWeek();
    await open({ description: "inbox" });
    await typeSearch("");
    expect(rowTitles()).toEqual(["Landing page hero", "Standup", "Inbox triage", "Hero copy"]);
  });
});
