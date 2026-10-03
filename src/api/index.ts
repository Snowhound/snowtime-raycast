import { getPreferenceValues } from "@raycast/api";
import { createClient, siteUrl } from "./client";

export { ApiError, isApiError, NO_ANSWER } from "./errors";
export type { Client } from "./client";
export type * from "./types";

// The client for the instance and key in the extension's preferences.
export function api() {
  const { instanceUrl, apiKey } = getPreferenceValues<Preferences>();
  return createClient({ instanceUrl, apiKey });
}

// A page of the Snowtime web app, such as an organization's at `/<slug>`.
export function snowtimeUrl(path = "") {
  return `${siteUrl(getPreferenceValues<Preferences>().instanceUrl)}${path}`;
}
