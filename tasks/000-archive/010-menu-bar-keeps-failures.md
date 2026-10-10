# 010: The menu bar keeps the last failed read

Status: done

A failed read shows in the menu only in the run that made it. Reopening the menu runs the
command again from the cache, so after a failed Refresh, or a failed background read, the
menu shows the last known timer as if nothing failed. The fix keeps the failure in the
`Cache` next to the timer, and sends no more requests.

## Acceptance criteria

- [x] `prototypes/running-timer.html` shows a reopened menu after a failed read, and the
      user approves it (2026-10-10, with a clickable error line that runs its fix)
- [x] A failed read of the timer or the Start Again entries, from Refresh, a background
      read, or the menu's Start Again or Stop Timer, saves its status, code, and message
      in the cache
- [x] Any answer from the API, also a start or stop from another command, clears it
- [x] A run from the cache shows the saved failure, with the time of the last successful
      read: "Showing the timer as of 10:37 AM."
- [x] The error line opens the preferences for an invalid key, else tries again
- [x] While a failure is kept, the menu bar shows the mark with an exclamation badge, one
      color and tinted like the normal icon (`assets/menu-bar-icon-error.png`); the title
      stays the elapsed time (2026-10-10)
- [x] `docs/architecture/README.md` ("The menu bar") records the decision
- [x] A person checks it in Raycast: Refresh with a wrong Instance URL, then reopen the menu
