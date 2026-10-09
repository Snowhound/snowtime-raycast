# 005: New timer from an empty Start Timer

Status: todo

Start Timer only offers a new timer once the user types, or when there are no recent
entries. To start one without a description, or to open an empty form, the user must type
something first. The running suggestion offers Start Again but no Stop Timer, which Recent
Entries has. Do this before the Store submission (task 004), since the screenshots show
Start Timer.

## Acceptance criteria

- [ ] `prototypes/start-timer.html` shows how a new timer is reached with nothing typed,
      such as a New Timer row or a New Timer action (`⌘N`) on every row, and the user
      approves it
- [ ] With nothing typed, the user can open the timer form empty, with the remembered
      project preselected
- [ ] The running suggestion has Stop Timer, with the shortcut Recent Entries uses
- [ ] `docs/architecture/README.md` ("Starting and continuing") records the decision
