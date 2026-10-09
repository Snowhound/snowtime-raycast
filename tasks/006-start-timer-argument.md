# 006: Start Timer takes the description as an argument

Status: todo

Raycast commands can take arguments in the root search, so a user could type "Start Timer",
Tab, and the description, without waiting for the list. Proposed: an optional
`description` argument that fills Start Timer's search bar, so the matching suggestions
and the New timer row show at once.

## Acceptance criteria

- [ ] The user approves the argument and how it behaves, and
      `docs/architecture/README.md` records it
- [ ] `start-timer` declares an optional text argument, and Start Timer opens with it in
      the search bar
- [ ] Without the argument, Start Timer behaves as before
- [ ] `extension/README.md` mentions the argument
