// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import Command from "./recent-entries";
import {
  at,
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

import { projects } from "./test/snowtime";

const snowtime = useCommandTest({ name: "recent-entries" });

function rowTitles(container: HTMLElement = document.body) {
  return within(container)
    .queryAllByRole("listitem")
    .map((row) => row.getAttribute("aria-label"));
}

function section(title: string) {
  return screen.getByRole("group", { name: title });
}

async function open() {
  renderCommand(<Command />);
  await settled();
}

describe("the list", () => {
  test("has every entry of the last 14 days, newest first, under its day with the day's total", async () => {
    snowtime().seedWeek();
    snowtime().entry({ description: "Long ago", startedAt: at(20, 10), stoppedAt: at(20, 11) });
    await open();

    expect(rowTitles()).toEqual([
      "Landing page hero",
      "Standup",
      "Inbox triage",
      "Hero copy",
      "Inbox triage",
      "Old footer",
      "Quarterly report",
    ]);
    // Landing page hero runs from 9:05 to 10:42, and Standup took 0:15.
    expect(section("Today").dataset.subtitle).toBe("1:52");
    expect(section("Yesterday").dataset.subtitle).toBe("2:25");
    expect(section("Thursday, Oct 1").dataset.subtitle).toBe("1:00");
  });

  test("shows each entry's project, ticket, and duration, and an archived project as such", async () => {
    snowtime().seedWeek();
    await open();
    const hero = await findRow("Hero copy");
    expect(hero.dataset.subtitle).toBe("Website redesign");
    expect(hero.dataset.accessories).toBe("WEB-12 | 1:15");
    expect((await findRow("Landing page hero")).dataset.accessories).toBe("WEB-12 | Running | 1:37");
    expect((await findRow("Old footer")).dataset.subtitle).toBe("Archived project");
    expect((await findRow("Quarterly report")).dataset.subtitle).toBe("No project");
  });

  test("names an entry without a description by its ticket, which also shows as its tag", async () => {
    snowtime().entry({
      ticket: "TASK-123",
      projectId: projects.website.id,
      startedAt: at(0, 10),
      stoppedAt: at(0, 10, 30),
    });
    snowtime().entry({ startedAt: at(0, 7), stoppedAt: at(0, 7, 10) });
    await open();
    expect((await findRow("TASK-123")).dataset.accessories).toBe("TASK-123 | 0:30");
    expect((await findRow("No description")).dataset.accessories).toBe("0:10");
  });

  test("filters by description, ticket, or project", async () => {
    snowtime().seedWeek();
    await open();
    await typeSearch("web-12");
    expect(rowTitles()).toEqual(["Landing page hero", "Hero copy"]);
    await typeSearch("nothing like this");
    expect(screen.getByRole("status", { name: "No matching entries" }).dataset.description).toBe(
      "Recent Entries shows the last 14 days.",
    );
  });
});

describe("actions", () => {
  test("stop the running entry first on its row", async () => {
    snowtime().seedWeek();
    await open();
    const row = await findRow("Landing page hero");
    expect(within(row).getAllByRole("button")[0].textContent).toBe("Stop Timer");
    await runAction(row, "Stop Timer");
    expect(snowtime().running()).toBeNull();
    expect(raycast.huds).toEqual(["Stopped “Landing page hero” at 1:37"]);
  });

  test("start any other entry again, and stop the running one with ⌘S", async () => {
    snowtime().seedWeek();
    await open();
    const row = await findRow("Quarterly report");
    const running = within(row).getByRole("group", { name: "Running Timer" });
    expect(within(running).getByRole("button", { name: "Stop Timer" }).dataset.shortcut).toBe("cmd+s");

    await runAction(row, "Start Again");
    expect(snowtime().running()).toMatchObject({ description: "Quarterly report", projectId: null });
  });

  test("copy the description and the ticket", async () => {
    snowtime().seedWeek();
    await open();
    const row = await findRow("Hero copy");
    await runAction(row, "Copy Description");
    await runAction(row, "Copy Ticket");
    expect(raycast.copied).toEqual(["Hero copy", "WEB-12"]);
  });

  test("push the form prefilled from the entry", async () => {
    snowtime().seedWeek();
    await open();
    await runAction(await findRow("Hero copy"), "Edit and Start");
    const form = await screen.findByRole("form", { name: "Edit and Start" });
    expect(within(form).getByLabelText("Description")).toHaveProperty("value", "Hero copy");
  });
});

describe("Merge Tickets", () => {
  test("shows a day's entries with one ticket as one row, with their count and total", async () => {
    snowtime().seedWeek();
    raycast.preferences.mergeTickets = true;
    await open();

    expect(rowTitles(section("Yesterday"))).toEqual(["Inbox triage", "Hero copy"]);
    expect((await findRow("Hero copy")).dataset.accessories).toBe("WEB-12 | 1:15");
    const triage = within(section("Yesterday")).getByRole("listitem", { name: "Inbox triage" });
    expect(triage.dataset.accessories).toBe("OPS-7 | 2 | 1:10");
  });

  test("keeps entries without a ticket and other days' entries apart", async () => {
    snowtime().seedWeek();
    raycast.preferences.mergeTickets = true;
    await open();
    // WEB-12 runs today and was worked on yesterday: two rows, one per day.
    expect(rowTitles(section("Today"))).toEqual(["Landing page hero", "Standup"]);
  });

  test("Show Entries lists a merged row's entries", async () => {
    snowtime().seedWeek();
    raycast.preferences.mergeTickets = true;
    await open();
    const triage = within(section("Yesterday")).getByRole("listitem", { name: "Inbox triage" });
    await runAction(triage, "Show Entries");
    await waitFor(() => expect(rowTitles()).toEqual(["Inbox triage", "Inbox triage"]));
    expect(section("Yesterday").dataset.subtitle).toBe("1:10");
  });
});

describe("empty and failed lists", () => {
  test("offer Start Timer when there are no entries", async () => {
    await open();
    const empty = screen.getByRole("status", { name: "No entries in the last 14 days" });
    await runAction(empty, "Start Timer");
    expect(raycast.launched).toEqual([{ name: "start-timer", type: "userInitiated" }]);
  });

  test("show the failure with Refresh, which loads the entries again", async () => {
    snowtime().seedWeek();
    snowtime().answerNext({ status: 500, body: { error: { message: "Something broke." } } }, /entries$/);
    await open();
    const view = screen.getByRole("status", { name: "Something broke" });
    await runAction(view, "Refresh");
    expect(await findRow("Standup")).toBeDefined();
  });
});
