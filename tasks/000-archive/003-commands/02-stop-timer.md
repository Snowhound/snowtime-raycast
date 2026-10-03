# 02: Stop Timer

Status: done

The no-view command, `src/stop-timer.ts`, with the HUD of task 001, subtask 04.

## Acceptance criteria

- [x] `package.json` declares it as `stop-timer`, mode `no-view`, titled Stop Timer
- [x] It reads the running timer and stops it by its id, so a timer started since in the
      web app isn't the one it stops by accident; a `404` says the timer already stopped
- [x] The HUD names the entry and its duration; with no timer running, a HUD says so
- [x] It clears the menu bar's cache and refreshes the menu bar
- [x] The user checks it in Raycast
