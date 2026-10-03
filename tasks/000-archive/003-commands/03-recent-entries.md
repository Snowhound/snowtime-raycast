# 03: Recent Entries

Status: done

The list command, `src/recent-entries.tsx`, from the prototype of task 001, subtask 03.

## Acceptance criteria

- [x] `package.json` declares it as `recent-entries`, mode `view`, titled Recent Entries
- [x] It reads the last 14 days with `GET /api/v1/orgs/:orgId/entries` and the projects with
      `GET /api/v1/orgs/:orgId/projects`, through `useCachedPromise`, so a second open shows
      the last list at once while it refreshes
- [x] Every entry is its own row, repeats included
- [x] It matches its approved prototype in every state, with the actions it lists
- [x] Edit and Start (`⌘↵`) pushes the timer form of subtask 01, prefilled from the entry,
      and Refresh (`⌘R`) reads the entries again
- [x] On the running entry, `↵` stops the timer; on any other, it starts the entry again
- [x] Start Again and Stop Timer update the list and the menu bar
- [x] Its command preference `mergeTickets` (Merge Tickets, a `checkbox`, off by default)
      merges a day's entries with the same ticket into one row; entries without a ticket
      stay their own; Show Entries (`⌘E`) on a merged row pushes a list of its entries
- [x] The user approves the prototype's Merge Tickets states (2026-10-03)
- [x] The user checks it in Raycast in light and dark, with one and with two organizations
