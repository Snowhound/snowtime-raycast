# 002: API client and shared code

Status: todo

What every command needs before it can talk to Snowtime, as
`docs/architecture/README.md` records it.

## Acceptance criteria

- [ ] `package.json` declares `platforms: ["macOS"]` and the two extension preferences,
      `instanceUrl` (default `https://snowtime.snowhound.eu`) and `apiKey` (`password`), both
      required, with descriptions that say where to create a key
- [ ] `src/api/` sends each request to `<instanceUrl>/api/v1` with `Authorization: Bearer`,
      tolerates a trailing slash in the URL, and returns typed answers for the six
      endpoints in Snowtime's `docs/api.md`
- [ ] Every failure becomes an `ApiError` with the status, code, and message; a request
      that gets no answer becomes one too, naming the host
- [ ] One helper shows an `ApiError` as the failure toast the architecture's "Errors"
      table gives, with its action
- [ ] `src/lib/` holds the `en-US` formatting (times, days, `h:mm` durations), the
      remembered organization in `LocalStorage` with its fallback, and UUID v7 entry ids
- [ ] Starting a timer retries once with the same id when it gets no answer, and treats a
      `409` on the retry as started only if `GET /api/v1/timer` returns that id
- [ ] Vitest covers `src/api/` and `src/lib/`, including each error case, the retry, the
      organization fallback, and a day boundary in the formatting; `npm test` runs it
- [ ] `npm run build`, `npm run lint`, and `npm test` pass
