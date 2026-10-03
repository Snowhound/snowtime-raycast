# 002: API client and shared code

Status: todo

What every command needs before it can talk to Snowtime, as
`docs/architecture/README.md` records it.

## Acceptance criteria

- [ ] `package.json` declares `platforms: ["macOS"]` and the three extension preferences:
      `instanceUrl` (default `https://snowtime.snowhound.eu`) and `apiKey` (`password`), both
      required, with descriptions that say where to create a key; and `suggestionRange`
      (Suggestions From: Today and yesterday, the default, Last 7 days, or Last 14 days)
- [ ] `src/api/` sends each request to `<instanceUrl>/api/v1` with `Authorization: Bearer`,
      tolerates a trailing slash in the URL, and returns typed answers for the six
      endpoints in Snowtime's `docs/api.md`
- [ ] Every failure becomes an `ApiError` with the status, code, and message; a request
      that gets no answer becomes one too, naming the host
- [ ] One helper shows an `ApiError` as the failure toast the architecture's "Errors"
      table gives, with its action
- [ ] `src/lib/` holds the `en-US` formatting (times, days, `h:mm` durations), the
      remembered organization in `LocalStorage` with its fallback, UUID v7 entry ids, and
      the ticket key pattern, the same as Snowtime's `TICKET_PATTERN`
      (`src/lib/tickets.ts`), so the form refuses a key the API would
- [ ] Starting a timer retries once with the same id when it gets no answer, and treats a
      `409` on the retry as started only if `GET /api/v1/timer` returns that id
- [ ] `src/lib/` saves the organization and project of the last started timer, and clears
      the project when the organization changes
- [ ] `src/lib/` ports `detectTicket` and its helpers from Snowtime's `src/lib/tickets.ts`,
      with the cases of its tests
- [ ] Vitest covers `src/api/` and `src/lib/`, including each error case, the retry, the
      organization fallback, and a day boundary in the formatting; `npm test` runs it
- [ ] `npm run build`, `npm run lint`, and `npm test` pass
