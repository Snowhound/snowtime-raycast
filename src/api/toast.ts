import { getPreferenceValues, open, openExtensionPreferences, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { ApiError, NO_ANSWER } from "./errors";

interface Options {
  // The toast's title, such as "Couldn't start timer".
  title: string;
  // The organization whose Settings a read-only key's toast opens.
  organizationSlug?: string;
}

// Shows a failed request as the failure toast of docs/architecture/README.md, "Errors":
// the API's message, with the action that fixes it.
export function showApiFailure(error: unknown, { title, organizationSlug }: Options) {
  if (!(error instanceof ApiError)) return showFailureToast(error, { title });
  return showFailureToast(error, {
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
  const { instanceUrl } = getPreferenceValues<Preferences>();
  const base = instanceUrl.trim().replace(/\/+$/, "");
  return organizationSlug ? `${base}/${encodeURIComponent(organizationSlug)}/settings` : base;
}
