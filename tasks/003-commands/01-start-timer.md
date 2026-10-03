# 01: Start Timer

Status: todo

The form command, `src/start-timer.tsx`, from the prototype of task 001, subtask 02. It
always opens empty. Its form is a component in `src/components/`, which Continue Timer
(subtask 05) and Recent Entries' Edit and Start (subtask 03) reuse prefilled.

## Acceptance criteria

- [ ] `package.json` declares it as `start-timer`, mode `view`, titled Start Timer
- [ ] It matches its approved prototype in every state, with `useForm` for validation
- [ ] It starts the timer through task 002's client, with its retry, and closes with a HUD
- [ ] It writes the started timer to the menu bar's cache and refreshes the menu bar
      (subtask 04)
- [ ] The form component takes initial values, and Start Timer passes none
- [ ] The user checks it in Raycast in light and dark
