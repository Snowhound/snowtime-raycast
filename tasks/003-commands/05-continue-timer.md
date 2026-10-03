# 05: Continue Timer

Status: done

The form command, `src/continue-timer.tsx`: the timer form of subtask 01, prefilled from the
running entry, or from the newest entry when none runs, from the prototype of task 001,
subtask 02.

## Acceptance criteria

- [x] `package.json` declares it as `continue-timer`, mode `view`, titled Continue Timer
- [x] It prefills the description, ticket, project, and organization from the running entry,
      or from the newest entry of the last 14 days when no timer runs
- [x] With no entries, it opens as Start Timer does, with the remembered project
- [x] Starting from it behaves as Start Timer: a new entry with a new id, the HUD, and the
      menu bar refreshed
- [x] It matches its approved prototype in every state
- [x] The user checks it in Raycast, with a timer running and without
