// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import Command from "./continue-timer";
import { at, raycast, renderCommand, runAction, screen, settled, useCommandTest, waitFor } from "./test/render";
import { orgs, projects } from "./test/snowtime";

const snowtime = useCommandTest({ name: "continue-timer" });

async function open() {
  renderCommand(<Command />);
  await screen.findByRole("form", { name: "Continue Timer" });
  await settled();
}

function value(field: string) {
  return (screen.getByLabelText(field) as HTMLInputElement).value;
}

describe("Continue Timer", () => {
  test("prefills the form from the running entry", async () => {
    snowtime().seedWeek();
    await open();
    expect(
      screen.getByText(
        "Continues “Landing page hero” (running since 9:05 AM). Starting stops it and starts a new entry.",
      ),
    ).toBeDefined();
    expect(value("Description")).toBe("Landing page hero");
    expect(value("Ticket")).toBe("WEB-12");
    await waitFor(() => expect(value("Project")).toBe(projects.website.id));
  });

  test("prefills the form from the newest entry when none runs", async () => {
    const week = snowtime().seedWeek();
    week.running.stoppedAt = at(0, 10);
    week.standup.startedAt = at(0, 10, 30);
    week.standup.stoppedAt = at(0, 10, 40);
    await open();
    expect(screen.getByText("Continues “Standup” from today, 10:30 AM.")).toBeDefined();
    expect(value("Description")).toBe("Standup");
  });

  test("continues in the running entry's organization", async () => {
    snowtime().entry({ description: "Audit prep", organizationId: orgs.harbor.id, startedAt: at(0, 10) });
    await open();
    await runAction(screen.getByRole("form"), "Start Timer");
    await waitFor(() =>
      expect(raycast.huds).toEqual(["Started “Audit prep” again and stopped the previous entry at 0:42"]),
    );
    expect(snowtime().running()?.organizationId).toBe(orgs.harbor.id);
  });

  test("opens empty with a note when there is nothing to continue", async () => {
    await open();
    expect(screen.getByText("Nothing to continue yet, so this starts a new timer.")).toBeDefined();
    expect(value("Description")).toBe("");
  });

  test("opens the empty form after a failed read, with the failure", async () => {
    snowtime().answerNext("offline", /\/timer$/);
    await open();
    expect(raycast.toasts.at(-1)).toMatchObject({
      title: "Couldn't load the last entry",
      message: "Can't reach snowtime.example.com.",
    });
    expect(value("Description")).toBe("");
  });
});
