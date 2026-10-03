import { getPreferenceValues } from "@raycast/api";
import { createClient } from "./client";

export { ApiError, isApiError, NO_ANSWER } from "./errors";
export type { Client } from "./client";
export type * from "./types";

// The client for the instance and key in the extension's preferences.
export function api() {
  const { instanceUrl, apiKey } = getPreferenceValues<Preferences>();
  return createClient({ instanceUrl, apiKey });
}
