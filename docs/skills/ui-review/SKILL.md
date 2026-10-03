---
name: ui-review
description: Drive a real browser with the agent-browser CLI to build, inspect, and verify the extension's HTML prototypes under prototypes/. Use whenever a task needs to see, screenshot, or click through a prototype instead of only reading its code, and prefer it over ad-hoc Playwright scripts.
---

# UI review with agent-browser

`agent-browser` is a CLI that drives Chrome. Use it to check the prototypes in
`prototypes/` before a command is built from them. It can't drive Raycast itself, so the
commands are checked in Raycast by a person (`docs/development.md`, "Checking a command").

## Before you start

```bash
agent-browser --version || npm install -g agent-browser   # ask the user before installing
agent-browser install                                     # first run only: downloads Chrome for Testing
```

Use a named session (`--session <name>`) and close only your own
(`agent-browser --session <name> close`), never `close --all`.

Prototypes open from disk and need no server or internet:

```bash
agent-browser --session proto open "file://$PWD/prototypes/start-timer.html"
```

The URL takes `?state=<fixture state>` and `?theme=light|dark`, so a screenshot names
exactly what it shows. Follow [`prototypes/README.md`](../../../prototypes/README.md) for
how prototypes are built; this skill covers checking them.

## Review loop

1. Open the prototype.
2. Step through every fixture state in the picker (`agent-browser select "#fixture" "<state>"`).
3. `agent-browser screenshot <scratch>/<page>-<state>.png`, then look at the image.
4. Use the keyboard the way Raycast is used: arrow keys, `↵`, `⌘↵`, `⌘K` for the action
   panel, `Esc` to close it (`agent-browser press Meta+k`). Actions with a `goto` move to
   the next state, so a flow can be walked end to end.
5. `agent-browser errors` and `agent-browser console`: a page that looks right but throws
   is not done.
6. Fix the prototype, `agent-browser reload`, repeat. Stop when no meaningful issue
   remains.

Write screenshots to the session's scratch directory, never into the repository.

## What to check

Raycast draws the real components, so judge structure and words, not pixels:

- **Raycast's conventions** (`docs/architecture/README.md`, "Raycast Store rules"): Title
  Case for command, action, and section titles; US English; a placeholder in every search
  bar and text field; an empty view for every list that can be empty; a loading state
  before data arrives, so the empty view doesn't flash.
- **Actions**: the primary action is the one people want most often; shortcuts follow
  Raycast's (`⌘↵` second, `⌘C` copy, `⌘O` open, `⌃X` destructive); destructive actions use
  the destructive style; every action has an icon when its neighbors do.
- **Copy**: short and factual, as `AGENTS.md` asks. Error toasts name what went wrong and
  what to do, in one line.
- **States**: loading, empty, populated, long text, every error the API can answer
  (`401`, `403`, `404`, `409`, `422`, `429`, offline), and one organization against several.
- **Both themes**: toggle with the page's button or `?theme=dark`.
- **The window**: Raycast's is 750 × 475, so check that long titles and accessories fit
  without clipping. Raycast runs only on the desktop, so a viewport of 1440 × 900 is
  enough.

Every icon carries the Raycast `Icon` name in its tooltip, and every control the component
it stands for. Use them when porting the prototype to a command.
