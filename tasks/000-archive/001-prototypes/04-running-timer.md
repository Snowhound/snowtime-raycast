# 04: Running Timer and Stop Timer

Status: done

`prototypes/running-timer.html`: the menu bar item and its menu, and the HUDs Stop Timer
shows.

## Acceptance criteria

- [x] With a timer running, the menu bar title is the elapsed time as `h:mm` beside a
      monochrome template icon, Snowtime's Hound Hour mark; with none, only the icon. The
      item's tooltip names the running entry
- [x] The menu: the running entry (description, project and ticket, start time and elapsed
      time, as information lines), Stop Timer (`⌘S`); Start Timer… (`⌘N`), Continue
      Timer… (`⌘⇧N`), and Recent Entries… (`⌘E`); up to five recent entries to start again
      (`⌘1`–`⌘5`), one per description, ticket, and project; then Open Snowtime (`⌘O`),
      Refresh (`⌘R`), and Configure Extension… (`⌘,`)
- [x] Stop Timer's HUD names the entry and its duration. With no timer running, a HUD says
      so: Stop Timer has no view, so Raycast's window is closed and a toast has nowhere to
      show
- [x] States: running and not running, each with the menu open and closed, a long
      description, a `401`, and no connection, where the menu says what failed, keeps the
      cached timer, and keeps Configure Extension
- [x] An entry without a description is named by its ticket, or "No description", in the
      menu and the HUDs, as every prototype now shows
- [x] `ui-review` passes in light and dark
- [x] A state hides the Start Again section, as the Running Timer preference Show Start
      Again allows (asked for at approval)
- [x] The user approves the prototype (2026-10-03)
