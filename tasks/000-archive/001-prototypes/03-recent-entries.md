# 03: Recent Entries

Status: done

`prototypes/recent-entries.html`: the list of recent entries, each of which can start again.
Decided 2026-10-03: every entry shows as its own row, repeats included.

## Acceptance criteria

- [x] Sections by day (Today, Yesterday, then `Friday, Oct 2`), each subtitled with its
      total. A row shows the description, the project as subtitle, and the ticket and
      duration as accessories, with the start and end in the duration's tooltip; the running
      entry is marked
- [x] The search bar filters by description, ticket, and project, with a placeholder, and
      holds an organization `List.Dropdown` when there is more than one
- [x] Actions: Start Again (`↵`), Edit and Start (`⌘↵`, pushes the timer form prefilled),
      Copy Description (`⌘C`), Copy Ticket (`⌘⇧C`), Open in Snowtime (`⌘O`), Stop Timer
      (`⌘S`) while a timer runs, and Refresh (`⌘R`). On the running entry, `↵` stops it,
      because starting it again would only split it
- [x] States: loading, one and several organizations, searching, no matches, no entries in
      the range (`List.EmptyView` with Start Timer as its action), a long description,
      the HUDs, a `401`, a `403` on Start Again, no connection, and the cached list while it
      refreshes
- [x] `ui-review` passes in light and dark
- [x] The user approves the prototype (2026-10-03)
