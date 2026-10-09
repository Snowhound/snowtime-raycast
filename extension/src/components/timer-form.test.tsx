// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import {
  choose,
  fill,
  raycast,
  renderCommand,
  runAction,
  screen,
  settled,
  useCommandTest,
  waitFor,
} from "../test/render";
import { orgs, projects } from "../test/snowtime";
import { TimerForm, type TimerFormProps } from "./timer-form";

const snowtime = useCommandTest({ name: "start-timer" });

async function open(props: Partial<TimerFormProps> = {}) {
  renderCommand(<TimerForm navigationTitle="Start Timer" {...props} />);
  await settled();
  // Projects load after the organizations; the field is ready once its options are there.
  await waitFor(() => expect(screen.getByLabelText("Project").querySelectorAll("option").length).toBeGreaterThan(1));
}

function form() {
  return screen.getByRole("form");
}

function value(field: string) {
  return (screen.getByLabelText(field) as HTMLInputElement).value;
}

describe("the Project field", () => {
  test("preselects the project of the last started timer", async () => {
    raycast.localStorage.set("projectId", projects.website.id);
    await open();
    await waitFor(() => expect(value("Project")).toBe(projects.website.id));
  });

  test("prefers the project of the entry the form starts from", async () => {
    raycast.localStorage.set("projectId", projects.website.id);
    await open({ description: "Standup", projectId: projects.internal.id });
    await waitFor(() => expect(value("Project")).toBe(projects.internal.id));
  });

  test("falls back to No project for a project the organization no longer lists", async () => {
    await open({ description: "Old footer", projectId: projects.legacy.id });
    expect(value("Project")).toBe("");
  });

  test("lists only the organization's active projects", async () => {
    await open();
    const options = [...screen.getByLabelText("Project").querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toEqual(["No project", "Website redesign", "Internal"]);
  });

  test("is cleared when the user changes the organization, which is remembered", async () => {
    raycast.localStorage.set("projectId", projects.website.id);
    await open();
    await waitFor(() => expect(value("Project")).toBe(projects.website.id));
    await choose("Organization", orgs.harbor.id);
    await waitFor(() => expect(screen.getByLabelText("Project").textContent).toContain("Audit"));
    expect(value("Project")).toBe("");
    expect(raycast.localStorage.get("organizationId")).toBe(orgs.harbor.id);
    expect(raycast.localStorage.has("projectId")).toBe(false);
  });
});

describe("submitting", () => {
  test("starts a timer with the fields' values", async () => {
    await open();
    await fill("Description", "Quarterly report");
    await fill("Ticket", "OPS-9");
    await choose("Project", projects.internal.id);
    await runAction(form(), "Start Timer");

    expect(snowtime().running()).toMatchObject({
      description: "Quarterly report",
      ticket: "OPS-9",
      projectId: projects.internal.id,
      organizationId: orgs.northwind.id,
    });
    expect(raycast.huds).toEqual(["Started “Quarterly report” on OPS-9"]);
  });

  test("takes a ticket key from the description when Ticket is empty", async () => {
    await open();
    await fill("Description", "[WEB-15] Footer links");
    await runAction(form(), "Start Timer");
    expect(snowtime().running()).toMatchObject({ description: "Footer links", ticket: "WEB-15" });
  });

  test("keeps a ticket the user typed", async () => {
    await open();
    await fill("Description", "WEB-15 Footer links");
    await fill("Ticket", "OPS-2");
    await runAction(form(), "Start Timer");
    expect(snowtime().running()).toMatchObject({ description: "WEB-15 Footer links", ticket: "OPS-2" });
  });

  test("refuses a ticket that isn't a ticket key", async () => {
    await open();
    await fill("Ticket", "nope");
    await runAction(form(), "Start Timer");
    expect(screen.getByRole("alert").textContent).toBe("Use a ticket key such as ABC-123.");
    expect(snowtime().calls()).not.toContain("POST /api/v1/organizations/org-northwind/timer/start");
  });

  test("starts the timer after loading the organizations failed, by loading them again", async () => {
    snowtime().answerNext("offline", /\/me$/);
    renderCommand(<TimerForm navigationTitle="Start Timer" />);
    await waitFor(() => expect(raycast.toasts.at(-1)).toMatchObject({ title: "Couldn't load organizations" }));
    await fill("Description", "Quarterly report");
    await runAction(form(), "Start Timer");

    await waitFor(() => expect(snowtime().running()).toMatchObject({ description: "Quarterly report" }));
    expect(snowtime().running()?.organizationId).toBe(orgs.northwind.id);
  });

  test("shows the failure again when the organizations still don't load", async () => {
    raycast.preferences.apiKey = "snow_wrong";
    renderCommand(<TimerForm navigationTitle="Start Timer" />);
    await waitFor(() => expect(raycast.toasts.at(-1)).toMatchObject({ title: "Couldn't load organizations" }));
    await runAction(form(), "Start Timer");

    await waitFor(() => expect(raycast.toasts.at(-1)).toMatchObject({ title: "Couldn't start timer" }));
    expect(raycast.toasts.at(-1)).toMatchObject({
      message: "Invalid API key.",
      primaryAction: { title: "Open Extension Preferences" },
    });
  });

  test("says to join an organization when the user has none", async () => {
    snowtime().state.organizations = [];
    renderCommand(<TimerForm navigationTitle="Start Timer" />);
    await settled();
    await runAction(form(), "Start Timer");
    await waitFor(() => expect(raycast.toasts.at(-1)).toMatchObject({ title: "No organizations" }));
  });
});
