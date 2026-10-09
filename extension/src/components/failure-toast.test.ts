import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError, NO_ANSWER } from "../api/errors";
import { showApiFailure } from "./failure-toast";

const raycast = vi.hoisted(() => ({
  environment: { commandMode: "view" },
  showHUD: vi.fn(),
  open: vi.fn(),
  openExtensionPreferences: vi.fn(),
  showFailureToast: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  environment: raycast.environment,
  showHUD: raycast.showHUD,
  getPreferenceValues: () => ({ instanceUrl: "https://snowtime.example.com/" }),
  open: raycast.open,
  openExtensionPreferences: raycast.openExtensionPreferences,
}));
vi.mock("@raycast/utils", () => ({ showFailureToast: raycast.showFailureToast }));

const title = "Couldn't start timer";

function toastOf(error: unknown, organizationSlug?: string) {
  raycast.showFailureToast.mockClear();
  showApiFailure(error, { title, organizationSlug });
  return raycast.showFailureToast.mock.calls[0][1];
}

beforeEach(() => {
  vi.clearAllMocks();
  raycast.environment.commandMode = "view";
});

describe("showApiFailure", () => {
  test("401 shows the API's message and opens the extension's preferences", () => {
    const toast = toastOf(new ApiError(401, "UNAUTHENTICATED", "Invalid API key.", "GET"));
    expect(toast).toMatchObject({
      title,
      message: "Invalid API key.",
      primaryAction: { title: "Open Extension Preferences" },
    });
    toast.primaryAction.onAction();
    expect(raycast.openExtensionPreferences).toHaveBeenCalled();
  });

  test("403 on a write opens the organization's Snowtime settings", () => {
    const toast = toastOf(new ApiError(403, "FORBIDDEN", "API key is read-only.", "POST"), "northwind");
    expect(toast).toMatchObject({
      message: "API key is read-only.",
      primaryAction: { title: "Open Snowtime Settings" },
    });
    toast.primaryAction.onAction();
    expect(raycast.open).toHaveBeenCalledWith("https://snowtime.example.com/northwind/settings");
  });

  test("403 on a read has no action", () => {
    const toast = toastOf(new ApiError(403, "FORBIDDEN", "Not a member of this organization.", "GET"));
    expect(toast).toMatchObject({ message: "Not a member of this organization.", primaryAction: undefined });
  });

  test("429 adds the wait", () => {
    expect(toastOf(new ApiError(429, "RATE_LIMITED", "Too many requests.", "POST", 5))).toMatchObject({
      message: "Too many requests. Try again in 5 seconds.",
      primaryAction: undefined,
    });
    expect(toastOf(new ApiError(429, "RATE_LIMITED", "Too many requests.", "POST", 1)).message).toBe(
      "Too many requests. Try again in 1 second.",
    );
  });

  test("no answer names the host and opens the extension's preferences", () => {
    const toast = toastOf(new ApiError(null, NO_ANSWER, "Can't reach snowtime.example.com.", "POST"));
    expect(toast).toMatchObject({
      message: "Can't reach snowtime.example.com.",
      primaryAction: { title: "Open Extension Preferences" },
    });
  });

  test("any other answer shows the API's message without an action", () => {
    const toast = toastOf(new ApiError(409, "CONFLICT", "Project is archived.", "POST"));
    expect(toast).toMatchObject({ message: "Project is archived.", primaryAction: undefined });
  });

  test("an error that isn't an ApiError keeps its own message", () => {
    const error = new Error("Boom");
    raycast.showFailureToast.mockClear();
    showApiFailure(error, { title });
    expect(raycast.showFailureToast).toHaveBeenCalledWith(error, { title });
  });

  test("the menu bar shows a HUD, having no window for a toast", async () => {
    raycast.environment.commandMode = "menu-bar";
    await showApiFailure(new ApiError(403, "FORBIDDEN", "API key is read-only.", "POST"), { title });
    expect(raycast.showHUD).toHaveBeenCalledWith("Couldn't start timer: API key is read-only.");
    expect(raycast.showFailureToast).not.toHaveBeenCalled();
  });
});
