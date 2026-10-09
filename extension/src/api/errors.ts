// Every failed request becomes an ApiError (docs/architecture/README.md, "Errors").

// The code of a request that got no answer; the API's own codes are in docs/api.md.
export const NO_ANSWER = "NO_ANSWER";

// The English text of each refusal key the extension's calls can answer, copied from
// errorMessages in the Snowtime repository's src/server/errors.ts. The API sends the key
// instead of the text, so the extension words them as the web app does.
const messages: Record<string, string> = {
  sign_in_required: "Sign in first.",
  not_organization_member: "You are not a member of this organization.",
  entry_not_found: "Entry not found.",
  entry_id_taken: "An entry with this id already exists.",
  entries_forbidden: "You cannot see this member's entries.",
  entry_too_long: "An entry can be at most 24 hours long.",
  entry_limit: "You have too many entries around this time. Delete some first.",
  timer_not_running: "This timer is not running.",
  timer_started_elsewhere: "Another timer was started at the same time.",
  timer_running_in_left_organization:
    "Your timer is still running in an organization you left. Ask an admin there to delete it.",
  project_not_found: "Project not found.",
  project_archived: "The project is archived.",
  rate_limited: "Too many changes in a short time. Wait a minute and try again.",
  database_unavailable: "Snowtime is down for maintenance. Try again in a few minutes.",
};

// The text of a refusal key, or undefined for a key added after this list.
export function messageOfKey(key: string): string | undefined {
  return Object.hasOwn(messages, key) ? messages[key] : undefined;
}

export class ApiError extends Error {
  constructor(
    // The HTTP status, or null when no answer came.
    readonly status: number | null,
    readonly code: string,
    message: string,
    // GET reads; any other method writes.
    readonly method: string,
    // The seconds a 429 asks to wait.
    readonly retryAfter: number | null = null,
    // The refusal's key, such as `timer_not_running`; null when the answer has none.
    readonly key: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
