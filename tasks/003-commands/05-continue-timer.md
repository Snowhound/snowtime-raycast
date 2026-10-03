# 05: Continue Timer

Status: todo

The form command, `src/continue-timer.tsx`: the timer form of subtask 01, prefilled from the
running entry, or from the newest entry when none runs, from the prototype of task 001,
subtask 02.

## Acceptance criteria

- [ ] `package.json` declares it as `continue-timer`, mode `view`, titled Continue Timer
- [ ] It prefills the description, ticket, project, and organization from the running entry,
      or from the newest entry of the last 14 days when no timer runs
- [ ] With no entries, it opens the empty form, as Start Timer does
- [ ] Starting from it behaves as Start Timer: a new entry with a new id, the HUD, and the
      menu bar refreshed
- [ ] It matches its approved prototype in every state
- [ ] The user checks it in Raycast, with a timer running and without
