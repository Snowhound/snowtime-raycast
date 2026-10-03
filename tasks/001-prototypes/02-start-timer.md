# 02: Start Timer and the timer form

Status: done

Two pages, decided 2026-10-03:

- `prototypes/start-timer.html`: Start Timer, a list whose search bar is the description,
  with recent entries as suggestions. With no match, ↵ opens the timer form.
- `prototypes/timer-form.html`: the timer form, which Start Timer's list pushes and
  Continue Timer opens prefilled from the running entry, or the newest entry when none
  runs.

## Acceptance criteria

Start Timer's list:

- [x] The search bar's placeholder asks what the user is working on; an organization
      `List.Dropdown` sits beside it with more than one organization
- [x] Suggestions come from the range of the Suggestions From preference (default: today
      and yesterday), one row per description, ticket, and project, grouped by day; the
      running entry is marked
- [x] Typing filters by description, ticket, and project, and adds a New timer row with the
      typed text; with no match it is the only row
- [x] ↵ on a suggestion starts it at once; ⌘↵ (Edit and Start) pushes the form prefilled
- [x] ↵ on New timer pushes the form with the typed description, a leading ticket key split
      off, and the remembered project
- [x] States: loading, one and several organizations, matches, no match, a typed ticket, no
      entries in the range, a `401`, and no connection

The timer form:

- [x] Fields: Description (`Form.TextField`, focused first), Ticket, Project
      (`Form.Dropdown` with "No project" first), and Organization (`Form.Dropdown`, only
      with more than one organization). Each has a placeholder
- [x] Changing the organization reloads the project list
- [x] Primary action Start Timer (`⌘↵`, as Raycast submits forms). The form closes and a HUD
      confirms; when a timer was running, the HUD names the one it stopped
- [x] States: loading, one organization, several organizations, no projects, a ticket that
      fails the API's check, a `403` from a read-only key, a `401`, and no connection, each
      with the toast `docs/architecture/README.md` ("Errors") gives
- [x] The project of the last timer is preselected, in Start Timer and in Continue Timer
      without an entry; changing the organization clears it. The Project field's `info`
      says so (decided 2026-10-03)
- [x] A ticket left empty is taken from the description on submit; the Ticket field's
      `info` says so, and a state shows the HUD naming the ticket (decided 2026-10-03)
- [x] Continue Timer states: prefilled from the running entry, prefilled from the newest
      entry with no timer running, and no entries at all, which opens the empty form
- [x] `ui-review` passes in light and dark
- [x] The user approves both pages (2026-10-03)
