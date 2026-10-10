# 006: Start Timer takes the description as an argument

Status: done

Raycast commands can take arguments in the root search, so a user could type "Start Timer",
Tab, and the description, without waiting for the list. Proposed: an optional
`description` argument that fills Start Timer's search bar, so the matching suggestions
and the New timer row show at once.

## Acceptance criteria

- [x] The user approves the argument and how it behaves (2026-10-10: it fills the search
      bar, and so does the fallback text), and `docs/architecture/README.md` records it
- [x] `start-timer` declares an optional text argument, and Start Timer opens with it in
      the search bar
- [x] As a fallback command, Start Timer opens with the root search's text the same way
- [x] Text from root search that matches no suggestion opens the timer form in the list's
      place, decided on the fresh suggestions; typing in the list never does (2026-10-10)
- [x] Until that decision, the list stays empty with its loading bar instead of showing
      cached rows
- [x] Without the argument, Start Timer behaves as before
- [x] `extension/README.md` mentions the argument
- [x] A person checks it in Raycast: the argument with and without a match, and Start Timer
      as a fallback command
