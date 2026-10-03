# 02: Start Timer and Continue Timer

Status: todo

`prototypes/start-timer.html`: the form that starts a timer, which Start Timer opens empty
and Continue Timer prefilled. Decided 2026-10-03: Start Timer always asks for a new
description, ticket, and project; Continue Timer prefills from the running entry, or the
newest entry when none runs.

## Acceptance criteria

- [ ] Fields: Description (`Form.TextField`, focused first), Ticket, Project
      (`Form.Dropdown` with "No project" first), and Organization (`Form.Dropdown`, only
      with more than one organization). Each has a placeholder
- [ ] Changing the organization reloads the project list
- [ ] Primary action Start Timer (`⌘↵`, as Raycast submits forms). The form closes and a HUD
      confirms; when a timer was running, the HUD names the one it stopped
- [ ] States: loading, one organization, several organizations, no projects, a ticket that
      fails the API's check, a `403` from a read-only key, a `401`, and no connection, each
      with the toast `docs/architecture/README.md` ("Errors") gives
- [ ] Continue Timer states: prefilled from the running entry, prefilled from the newest
      entry with no timer running, and no entries at all, which opens the empty form
- [ ] `ui-review` passes in light and dark; the user approves the prototype
