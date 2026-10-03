# 01: Start Timer

Status: done

The list command, `src/start-timer.tsx`, and the timer form it pushes, from the prototypes
of task 001, subtask 02 (`docs/architecture/README.md`, "Starting and continuing"). The form
is a component in `src/components/`, which Continue Timer (subtask 05) and Recent Entries'
Edit and Start (subtask 03) open prefilled.

## Acceptance criteria

- [x] `package.json` declares it as `start-timer`, mode `view`, titled Start Timer
- [x] The list reads the suggestions range from the `suggestionRange` preference through
      `useCachedPromise`, and shows one row per description, ticket, and project
- [x] ↵ on a suggestion starts it through task 002's client, with its retry, and closes with
      a HUD; ⌘↵ pushes the form prefilled from it
- [x] With typed text, the New timer row pushes the form with the description, a leading
      ticket key split off with the ported `detectTicket`, and the remembered project, if the
      organization still lists it
- [x] The form validates with `useForm`; on submit with Ticket empty, it takes the ticket
      from the description, and the HUD names it
- [x] Every start saves its organization and project for the next form, writes the started
      timer to the menu bar's cache, and refreshes the menu bar (subtask 04)
- [x] Both match their approved prototypes in every state
- [x] The user checks it in Raycast in light and dark
