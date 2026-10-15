# 014: Delete entries

Status: todo

Let the user delete an entry from Recent Entries, and discard the running timer, such as
one started by mistake. Stopping a mistaken timer still leaves an entry in the reports. This
waits for Snowtime task 094, which opens the delete call to keys; deleting the running
entry there discards the timer.

## Initial ideas

Nothing below is decided. A prototype settles the views before any code
(`prototypes/README.md`).

### Deleting a past entry

- Recent Entries gets Delete Entry in each row's Entry section, with
  `Keyboard.Shortcut.Common.Remove` (`⌃X`) and `Action.Style.Destructive`, as Raycast's
  own extensions do.
- A merged row offers no Delete Entry, for the reason task 013 gives for editing; its Show
  Entries list offers it on each entry. Delete All, with the count in the title, is the
  alternative.
- Delete Entry asks first with `confirmAlert`, naming the entry and its duration ("Delete
  'Landing page', 1:30?"). The API can't restore a deleted entry, so the toast can't offer
  Undo, and the confirmation is the only guard.
- After a delete, Recent Entries reloads and a toast confirms. A `404` `entry_not_found`
  counts as deleted, as a retried delete answers it.

### Discarding the running timer

- Discard Timer sits beside Stop Timer in Start Timer's and Recent Entries' Running Timer
  sections, and asks first as Delete Entry does. It updates the timer cache and the menu
  bar as a stop does: it clears the cache before its request and puts the timer back if
  the request fails.
- The menu bar has no window, so it may not be able to show `confirmAlert`. Open: whether
  the menu's Discard Timer… launches a small confirming command, or the menu offers no
  discard and points to Recent Entries. A discard without a confirmation isn't proposed,
  as a mistaken click would lose the entry.
- Recommendation: leave Discard Timer out of the menu first. Beside Stop Timer it invites
  a slip, and the list commands cover it.

## Acceptance criteria

- [ ] Snowtime task 094 is done, and `docs/api.md` documents the delete call
- [ ] A prototype of Delete Entry, Discard Timer, and their confirmations is approved
- [ ] `docs/architecture/README.md` records the decisions, and `docs/product.md` updates
      Recent Entries and removes deleting from "Not in the first version"
- [ ] An entry can be deleted from Recent Entries and its Show Entries list, after a
      confirmation
- [ ] The running timer can be discarded, after a confirmation, and the menu bar shows no
      timer at once
- [ ] A failed discard puts the timer back in the menu bar
- [ ] Tests cover deleting, discarding, cancelling the confirmation, a repeated delete,
      and the API's refusals
