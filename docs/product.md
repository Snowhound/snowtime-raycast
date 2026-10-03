# Product

Snowtime for Raycast lets a Snowtime user start, stop, and watch their timer without
opening the web app. It talks to any Snowtime instance through its HTTP API, with a personal
API key.

## Commands

| Command        | Mode     | Does                                                                                  |
| -------------- | -------- | ------------------------------------------------------------------------------------- |
| Start Timer    | View     | A form for the description, ticket, project, and organization; starts a timer         |
| Continue Timer | View     | The same form, prefilled from the running or the newest entry                         |
| Stop Timer     | No view  | Stops the running timer and confirms with a HUD                                       |
| Recent Entries | View     | The last 14 days of entries, newest first, each one shown; starts any again           |
| Running Timer  | Menu bar | The running timer's elapsed time; stops it, refreshes, or starts a recent entry again |

Starting a timer stops the running one first, wherever it runs, as in the web app.

## Not in the first version

- Editing or deleting entries, and adding finished ones. The API has no endpoints for them.
- Creating projects, reports, and team views. They stay in the web app.
- Windows. Raycast for Windows has no menu bar, and the menu bar is the extension's main
  view.
- Signing in without an API key. Device sign-in waits for Snowtime's Rust backend
  (Snowtime task 082).
