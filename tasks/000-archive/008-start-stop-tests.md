# 008: Tests for every command

Status: done

`components/start.ts` and `components/stop.ts` hold the extension's riskiest logic, and no
test covers them: the menu bar cache, its restore when a stop fails, and the answer to a
stop of an entry that already stopped. The commands had no tests at all; the user asked
for every command to be covered (2026-10-09).

## Acceptance criteria

- [x] `startTimer` is tested: it caches the started timer and remembers the organization
      and project on success, and on failure leaves the cache alone and shows the toast
- [x] `stopTimer` is tested: it clears the cache before the request, puts the timer back
      when the request fails, shows the running timer after a `404`, and says when no
      timer runs
- [x] Start Timer, Continue Timer, Stop Timer, Recent Entries, Running Timer, and the
      timer form have tests, against stand-ins for `@raycast/api` and Snowtime in
      `src/test/`
- [x] `docs/architecture/README.md` ("Tests") records the approach, replacing "commands
      are checked by hand"
- [x] `npm test` passes
