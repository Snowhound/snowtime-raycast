// Every failed request becomes an ApiError (docs/architecture/README.md, "Errors").

// The code of a request that got no answer; the API's own codes are in docs/api.md.
export const NO_ANSWER = "NO_ANSWER";

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
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
