# 012: Edit the running timer

Status: todo

Let the user change the running timer's description, ticket, project, and start time
without stopping it, as the web app's timer bar does. The common case is a timer started
late ("I began 15 minutes ago") or under the wrong ticket. Continue Timer can't do this:
it starts a new entry, which splits the time. The API has no edit call for keys yet, so
this waits for Snowtime task 094.

## Initial ideas

Nothing below is decided. A prototype settles the views before any code
(`prototypes/README.md`).

### Where editing starts

- A new view command, Edit Timer, opens the timer form prefilled from the running entry.
  With no timer running, it shows an empty view that offers Start Timer. A command of its
  own makes editing reachable from root search and lets the menu bar launch it, since a
  menu can't push a form.
- The menu bar's running section gets Edit Timer… beside Stop Timer. `⌘E` is taken by
  Recent Entries…, so it needs another shortcut, such as `⌘⇧E`.
- Start Timer and Recent Entries add Edit Timer to the Running Timer section, beside Stop
  Timer. In Recent Entries `⌘E` is Show Entries, so the same shortcut as the menu bar
  keeps them alike.
- Alternative: Continue Timer offers Save Changes beside Start when a timer runs. One form
  with two submits makes ↵ ambiguous, so a separate command is the starting proposal.

### The form

- The shared timer form (`components/timer-form.tsx`) in an edit mode: the same
  Description, Ticket, and Project fields, plus Started At as a `Form.DatePicker` with
  `DateTime`, and Save Timer as its submit.
- The organization shows as text, not a dropdown. An entry can't move between
  organizations, and the edit call is scoped to the entry's organization.
- Ticket extraction from the description runs on save as it does on start ("Tickets from
  the description").
- The form checks Started At before it sends: not in the future, and no more than 24 hours
  ago, as an entry lasts at most 24 hours. The API's own refusals (overlap with the
  previous entry, entry limit) show as failure toasts through `ApiError`, with their keys
  copied into `src/api/errors.ts`.
- Open: whether a save updates the remembered project, as a start does. Saving it is
  consistent; not saving it keeps a correction from changing the next timer's default.

### After a save

- The save writes the answered entry to the timer `Cache` and refreshes the menu bar with
  `launchCommand`, as start and stop do, and confirms with a HUD ("Updated WEB-15").
- The timer may have stopped since the form opened, in the web app or another command. The
  edit then lands on a stopped entry. The extension reads `stoppedAt` in the answer and
  says so ("The timer had stopped; saved the changes to the entry") rather than showing it
  as running.

### Later, not in this task

- Quick adjustments in the menu bar, such as Started 5 Minutes Earlier, without a form.
- Editing past entries from Recent Entries: task 013.
- Deleting entries and discarding the running timer: task 014.

## Acceptance criteria

- [ ] Snowtime task 094 is done, and `docs/api.md` documents the edit call
- [ ] A prototype of Edit Timer, the form's edit mode, and the new menu and list actions is
      approved
- [ ] `docs/architecture/README.md` records the decisions, and `docs/product.md` adds the
      command and narrows "Editing or deleting entries" under "Not in the first version"
- [ ] The running timer's description, ticket, project, and start time can be changed from
      the menu bar, Start Timer, and Recent Entries, and the timer keeps running
- [ ] The menu bar shows the change at once, without reading the API
- [ ] An edit of a timer stopped in the meantime says so, and the menu bar shows no timer
- [ ] Tests cover the command, the new actions, invalid start times, and the API's
      refusals
- [ ] The README and `help.md` mention editing, and the write scope it needs
