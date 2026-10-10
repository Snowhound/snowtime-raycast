// Runs a command in a test: the Raycast stand-in, a fake Snowtime as `fetch`, a fixed clock,
// and a navigation stack for Action.Push. A command test file starts with
// `// @vitest-environment happy-dom` and calls `useCommandTest()` at its top.

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { environment, raycast, resetRaycast } from "./raycast-api";
import { API_KEY, createSnowtime, INSTANCE, NOW, orgs, type Snowtime } from "./snowtime";

export { at, NOW } from "./snowtime";

export const preferences = {
  instanceUrl: INSTANCE,
  apiKey: API_KEY,
  suggestionRange: "2",
  timeFormat: "12-hour",
  mergeTickets: false,
  showStartAgain: true,
};

// Sets up every test of the file, and answers the fake Snowtime of the running test.
export function useCommandTest(command: { name: string; mode?: "view" | "no-view" | "menu-bar" }) {
  const current: { snowtime: Snowtime } = { snowtime: createSnowtime() };
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    resetRaycast({ ...preferences });
    // The user works in Northwind, as the prototypes show; Harbor sorts first.
    raycast.localStorage.set("organizationId", orgs.northwind.id);
    environment.entryPointName = command.name;
    environment.entryPointMode = command.mode ?? "view";
    current.snowtime = createSnowtime();
    vi.stubGlobal("fetch", current.snowtime.fetch);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  return () => current.snowtime;
}

// Renders a command's view, and the views its actions push on top of it.
export function renderCommand(view: ReactElement) {
  function Navigation() {
    const [stack, setStack] = useState([view]);
    raycast.push = (next) => setStack((views) => [...views, next]);
    return stack[stack.length - 1];
  }
  return render(<Navigation />);
}

// A list row by its title, once it shows.
export function findRow(title: string | RegExp) {
  return screen.findByRole("listitem", { name: title });
}

// Runs an action, and waits until what it started has finished.
export async function runAction(container: HTMLElement, title: string | RegExp) {
  const button = within(container).getByRole("button", { name: title });
  await act(async () => {
    fireEvent.click(button);
    await Promise.allSettled(raycast.running.splice(0));
  });
}

export async function typeSearch(text: string) {
  await act(async () => void fireEvent.change(screen.getByRole("searchbox"), { target: { value: text } }));
}

// Picks an option of a dropdown, named by its title.
export async function choose(label: string, value: string) {
  await act(async () => void fireEvent.change(screen.getByLabelText(label), { target: { value } }));
}

export async function fill(field: string, value: string) {
  await act(async () => void fireEvent.change(screen.getByLabelText(field), { target: { value } }));
}

// Waits until no view or toast says it is loading.
export async function settled() {
  await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull());
}

export { raycast, screen, waitFor, within };
