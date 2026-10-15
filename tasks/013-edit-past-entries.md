# 013: Edit past entries

Status: todo

Let the user fix a finished entry from Recent Entries: its description, ticket, project,
start, and end. Today a wrong entry means opening the web app. This builds on task 012's
edit form and waits for Snowtime task 094, which opens the edit call to keys.

## Initial ideas

Nothing below is decided. A prototype settles the views before any code
(`prototypes/README.md`).

### Where editing starts

- Recent Entries gets Edit Entry in each row's Entry section, with the shortcut task 012
  picks for Edit Timer. On the running row it is Edit Timer and opens task 012's form.
- A merged row (`mergeTickets`) holds several entries, and its other actions act on the
  newest. An edit there could change an entry the user didn't mean, so a merged row
  offers no Edit Entry; its Show Entries list offers it on each entry. Editing the newest,
  like the other actions, is the alternative.
- Start Timer's suggestions stay for starting, without Edit Entry, because a suggestion
  stands for several entries with the same description, ticket, and project.

### The form

- Task 012's edit mode with Stopped At added, both as `Form.DatePicker` with `DateTime`. A
  `Form.Description` under them shows the duration as `h:mm` while the user changes them.
- An alternative is a Duration text field (`1:30`) that moves the end. It is quicker for
  the common fix but adds a parser; the prototype can show both.
- The form checks before it sends: the end after the start, no more than 24 hours apart,
  and neither in the future. The API's refusals show as failure toasts.
- An entry whose project is archived keeps it: the API allows keeping one but not moving
  time onto one. The Project dropdown then lists the archived project, named from
  `GET /api/v1/organizations/:orgId/projects?includeArchived=true`, which also fixes
  Recent Entries' "Archived project" subtitle.
- Organization and ticket extraction behave as in task 012. A save doesn't change the
  remembered project, because fixing an old entry says nothing about the next timer.

### After a save

- Recent Entries reloads the range, so the row moves if its start moved to another day.
  A HUD isn't needed, since the list shows the change; a success toast confirms it.
- The menu bar's Start Again lines come from the same entries and stay stale until its
  next read. Open: whether a save refreshes the menu bar with a read, at three requests,
  or waits for the next background read within 5 minutes.

## Acceptance criteria

- [ ] Task 012 is done
- [ ] A prototype of Edit Entry in Recent Entries, merged rows included, and of the form
      with an end time is approved
- [ ] `docs/architecture/README.md` records the decisions, and `docs/product.md` updates
      Recent Entries and "Not in the first version"
- [ ] A finished entry's description, ticket, project, start, and end can be changed from
      Recent Entries and its Show Entries list
- [ ] An entry on an archived project keeps it unless the user picks another
- [ ] Invalid times are caught in the form, and the API's refusals show as failure toasts
- [ ] Tests cover the action, merged rows, the time checks, archived projects, and the
      API's refusals
