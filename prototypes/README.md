# UI prototypes

Static HTML prototypes of the extension's commands, for agreeing on their structure,
copy, and actions before building them. Open each file in a browser (`file://`); there is
no build step and nothing loads from the network. Check them with the `ui-review` skill
([`docs/skills/ui-review/SKILL.md`](../docs/skills/ui-review/SKILL.md)). When handing off a
prototype, include its absolute `file:///` URL so it opens directly.

## The flow

1. A command's task starts with its prototype: one page in this folder, with a fixture
   state for every case the command meets.
2. An agent checks the page with `ui-review` and fixes what it finds.
3. The user approves the prototype. Its task records the approval, and only then does the
   command get built.
4. The command ports the prototype's data: each view is shaped like the Raycast component
   it stands for, so `type: 'list'` becomes `<List>`, and its `actions` become the
   `<ActionPanel>`.
5. A change to an approved command updates its prototype first, so the two stay the same.

## What a prototype can and can't show

Raycast draws every component itself; an extension chooses only which components, in what
order, with what words, icons, and actions. So a prototype decides those, and its colors,
sizes, and fonts only need to read as Raycast. Don't spend review time on pixels.

## Files

| File                                 | Role                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| [raycast.js](raycast.js)             | Draws a page: the state picker, the theme switch, and the Raycast views |
| [raycast.css](raycast.css)           | The window, list, form, action panel, toast, HUD, and menu bar          |
| [fixtures.js](fixtures.js)           | Fictional data in the API's shapes, a fixed `NOW`, and the formatting   |
| [menu-bar-mark.js](menu-bar-mark.js) | Snowtime's mark in one color, for the menu bar's template icon          |
| [kit.html](kit.html)                 | Every view type and state, for checking the engine itself               |
| `../assets/extension-icon.png`       | The extension icon, shown in the action bar                             |

A page loads `raycast.css`, `fixtures.js`, and `raycast.js`, then calls
`Raycast.prototype({ title, notes, states })`. `raycast.js` documents the view shapes at
its top. Each state is a function that returns one view, so a state can derive from
another (`{ ...list, isLoading: true }`).

Fixtures follow the answers in the Snowtime API's contract (`docs/api.md` in the Snowtime
repository), so a prototype can't show data the API doesn't send. All fixtures read the
same moment, `Fixtures.NOW`: Monday 5 October 2026, 10:42 local time.

## Prototypes

| Page                                       | Command                                     | Status   |
| ------------------------------------------ | ------------------------------------------- | -------- |
| [kit.html](kit.html)                       | The engine                                  | Done     |
| [start-timer.html](start-timer.html)       | Start Timer                                 | Approved |
| [timer-form.html](timer-form.html)         | The timer form: Start Timer, Continue Timer | Approved |
| [recent-entries.html](recent-entries.html) | Recent Entries                              | Approved |
| [running-timer.html](running-timer.html)   | Running Timer, Stop Timer                   | Approved |

Task 001 adds a page per command.
