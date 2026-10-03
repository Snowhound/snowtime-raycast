# 03: Recent Entries

Status: todo

The list command, `src/recent-entries.tsx`, from the prototype of task 001, subtask 03.

## Acceptance criteria

- [ ] `package.json` declares it as `recent-entries`, mode `view`, titled Recent Entries
- [ ] It reads the last 14 days with `GET /api/v1/orgs/:orgId/entries` and the projects with
      `GET /api/v1/orgs/:orgId/projects`, through `useCachedPromise`, so a second open shows
      the last list at once while it refreshes
- [ ] Every entry is its own row, repeats included
- [ ] It matches its approved prototype in every state, with the actions it lists
- [ ] Edit and Start pushes the timer form of subtask 01, prefilled from the entry, and
      Refresh (`⌘R`) reads the entries again
- [ ] Start Again and Stop Timer update the list and the menu bar
- [ ] The user checks it in Raycast in light and dark, with one and with two organizations
