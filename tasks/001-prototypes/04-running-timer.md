# 04: Running Timer and Stop Timer

Status: todo

`prototypes/running-timer.html`: the menu bar item and its menu, and the HUD Stop Timer
shows.

## Acceptance criteria

- [ ] With a timer running, the menu bar title is the elapsed time as `h:mm` beside a
      monochrome icon; with none, only the icon
- [ ] The menu: the running entry (description, project, ticket, start time), Stop Timer,
      then up to five recent entries to start again, Start Timer…, Continue Timer…, Refresh
      (`⌘R`), Open Snowtime, and Configure Extension
- [ ] Stop Timer's HUD names the entry and its duration; with no timer running, a failure
      toast says so
- [ ] States: running, not running, a running entry with a long description, a `401`, and
      no connection, where the menu says what failed and keeps Configure Extension
- [ ] `ui-review` passes in light and dark; the user approves the prototype
