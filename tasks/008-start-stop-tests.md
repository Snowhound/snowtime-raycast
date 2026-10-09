# 008: Tests for starting and stopping

Status: todo

`components/start.ts` and `components/stop.ts` hold the extension's riskiest logic, and no
test covers them: the menu bar cache, its restore when a stop fails, and the answer to a
stop of an entry that already stopped. `api/toast.test.ts` shows how to mock
`@raycast/api`.

## Acceptance criteria

- [ ] `startTimer` is tested: it caches the started timer and remembers the organization
      and project on success, and on failure leaves the cache alone and shows the toast
- [ ] `stopTimer` is tested: it clears the cache before the request, puts the timer back
      when the request fails, shows the running timer after a `404`, and says when no
      timer runs
- [ ] `npm test` passes
