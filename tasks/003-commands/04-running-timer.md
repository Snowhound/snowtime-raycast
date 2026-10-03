# 04: Running Timer

Status: todo

The menu bar command, `src/running-timer.tsx`, from the prototype of task 001, subtask 04.

## Acceptance criteria

- [ ] `package.json` declares it as `running-timer`, mode `menu-bar`, titled Running Timer,
      with `interval: "1m"`, and its command preference `showStartAgain` (`checkbox`, on by
      default), which hides the Start Again section when off
- [ ] The title counts the elapsed time on the client from `startedAt`
- [ ] It reads the API as `docs/architecture/README.md` ("The menu bar") records: every
      fifth background run, every run the user starts (opening the menu, or running it from
      Raycast's search), and Refresh (`⌘R`); other runs count from the cache
- [ ] Its menu matches the approved prototype, with its shortcuts, and every item that
      changes the timer updates the cache
- [ ] Without a connection it keeps showing the cached timer and says what failed
- [ ] The icon is a monochrome template image of the Hound Hour mark
      (`prototypes/menu-bar-mark.js` holds it as SVG), so it follows the menu bar's color
- [ ] The user checks it in the menu bar for at least an hour of running time, that a timer
      started in the web app shows within 5 minutes, and that Refresh shows it at once
