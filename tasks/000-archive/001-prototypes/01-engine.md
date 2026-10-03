# 01: Prototype engine

Status: done

The files every prototype loads, and a kit page that shows each view type and state.

## Acceptance criteria

- [x] `raycast.js` draws a list, form, action panel, toast, HUD, and menu bar from plain
      data shaped like the Raycast components
- [x] A fixture state picker and a theme switch, both kept in the URL
- [x] The keyboard works as in Raycast: arrow keys, `↵`, `⌘↵`, `⌘K`, and `Esc`
- [x] Icons carry their Raycast `Icon` name, and controls their component, in a tooltip
- [x] `fixtures.js` holds fictional data in the API's shapes and a fixed `NOW`
- [x] `kit.html` passes the `ui-review` loop in light and dark, with no console errors
- [x] `prototypes/README.md` describes the flow; `docs/skills/ui-review/SKILL.md` the review
