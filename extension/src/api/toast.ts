import { environment, getPreferenceValues, open, openExtensionPreferences, showHUD, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { siteUrl } from "./client";
import { ApiError, NO_ANSWER } from "./errors";

interface Options {
  // The toast's title, such as "Couldn't start timer".
  title: string;
  // The organization whose Settings a read-only key's toast opens.
  organizationSlug?: string;
}

// Shows a failed request as the failure toast of docs/architecture/README.md, "Errors":
// the API's message, with the action that fixes it. The menu bar has no window for a toast,
// so there it is a HUD.
export async function showApiFailure(error: unknown, { title, organizationSlug }: Options): Promise<void> {
  if (environment.commandMode === "menu-bar") {
    const message = error instanceof ApiError ? messageOf(error) : error instanceof Error ? error.message : "";
    await showHUD(message ? `${title}: ${message}` : title);
    return;
  }
  if (!(error instanceof ApiError)) {
    await showFailureToast(error, { title });
    return;
  }
  await showFailureToast(error, {
    title,
    message: messageOf(error),
    primaryAction: actionOf(error, organizationSlug),
  });
}

function messageOf(error: ApiError) {
  if (error.status === 429 && error.retryAfter) {
    const seconds = error.retryAfter === 1 ? "1 second" : `${error.retryAfter} seconds`;
    return `${error.message} Try again in ${seconds}.`;
  }
  return error.message;
}

function actionOf(error: ApiError, organizationSlug?: string): Toast.ActionOptions | undefined {
  if (error.status === 401 || error.code === NO_ANSWER) {
    return { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() };
  }
  if (error.status === 403 && error.method !== "GET") {
    return { title: "Open Snowtime Settings", onAction: () => open(settingsUrl(organizationSlug)) };
  }
  return undefined;
}

function settingsUrl(organizationSlug?: string) {
  const base = siteUrl(getPreferenceValues<Preferences>().instanceUrl);
  return organizationSlug ? `${base}/${encodeURIComponent(organizationSlug)}/settings` : base;
}
