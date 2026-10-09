# 005: New timer from an empty Start Timer

Status: done

Start Timer only offers a new timer once the user types, or when there are no recent
entries. To start one without a description, or to open an empty form, the user must type
something first. The running suggestion offers Start Again but no Stop Timer, which Recent
Entries has. Do this before the Store submission (task 004), since the screenshots show
Start Timer.

## Acceptance criteria

- [x] `prototypes/start-timer.html` shows how a new timer is reached with nothing typed,
      a New Timer action (`⌘N`) on every row, and the user approves it (2026-10-09)
- [x] With nothing typed, the user can open the timer form empty, with the remembered
      project preselected; with text typed, New Timer opens it with that text
- [x] The running suggestion has Stop Timer, with the shortcut Recent Entries uses
- [x] `docs/architecture/README.md` ("Starting and continuing") records the decision
- [x] A person checks New Timer and Stop Timer in Raycast, with and without typed text
