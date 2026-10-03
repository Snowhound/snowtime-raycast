# 03: Recent Entries

Status: todo

`prototypes/recent-entries.html`: the list of recent entries, each of which can start again.
Decided 2026-10-03: every entry shows as its own row, repeats included.

## Acceptance criteria

- [ ] Sections by day (Today, Yesterday, then `Monday, Oct 5`), each subtitled with its
      total. A row shows the description, the project as subtitle, and the ticket and
      duration as accessories; the running entry is marked
- [ ] The search bar filters by description, ticket, and project, with a placeholder, and
      holds an organization `List.Dropdown` when there is more than one
- [ ] Actions: Start Again (primary), Edit and Start (pushes Start Timer prefilled), Copy
      Description (`⌘C`), Copy Ticket, Open in Snowtime (`⌘O`), Refresh (`⌘R`), and Stop
      Timer on the running entry
- [ ] States: loading, no entries in the range (`List.EmptyView` with Start Timer as its
      action), a running entry, long descriptions, and the errors of subtask 02
- [ ] `ui-review` passes in light and dark; the user approves the prototype
