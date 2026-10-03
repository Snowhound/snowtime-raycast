# Architecture

The decisions the extension follows, and why. An item marked **Proposed** waits for the
user's approval, and the task that depends on it names it.

## Stack

| Concern    | Choice                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Platform   | Raycast extension, macOS only (`platforms: ["macOS"]`), because the running timer lives in the menu bar                |
| UI         | `@raycast/api` components, with `@raycast/utils` hooks (`useFetch`, `useCachedPromise`, `useForm`, `showFailureToast`) |
| Language   | TypeScript 6.0: `@raycast/eslint-config` 2.2 supports TypeScript below 6.1                                             |
| Packages   | npm, because the Raycast Store builds from `package-lock.json`                                                         |
| Lint       | `ray lint`: ESLint with Raycast's config, Prettier, and the Store's manifest and icon checks                           |
| Tests      | Vitest for the modules without UI (`src/api/`, `src/lib/`); commands are checked by hand in Raycast                    |
| Prototypes | Static HTML in `prototypes/`, approved before a command is built (`prototypes/README.md`)                              |

The only other runtime dependency is `uuid`, for UUID v7 entry ids.

## The Snowtime API is the only backend

The extension calls only Snowtime's `/api/v1`, whose contract is `docs/api.md` in the
Snowtime repository. It reads no Snowtime page, cookie, or server function, so it tests the
public API the way any client would, and keeps working while Snowtime's backend moves to
Rust (Snowtime task 081). A feature the API lacks is added to the API first.

## Code layout

| Path                | Holds                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| `src/<command>.tsx` | One file per command, named as in `package.json`, as Raycast requires            |
| `src/api/`          | The API client: requests, response types, and the error type                     |
| `src/lib/`          | Code without UI: formatting, the organization choice, entry ids, the timer cache |
| `src/components/`   | Views and actions that more than one command uses                                |

A command file only wires its view. Logic it shares goes to `src/lib/` or `src/api/`, where
tests reach it.

## Sign-in and preferences

The extension signs in with a personal API key that the user creates in Snowtime under
Settings → API keys. Three extension preferences, which every command shares:

| Preference        | Type        | Required | Default                         |
| ----------------- | ----------- | -------- | ------------------------------- |
| `instanceUrl`     | `textfield` | Yes      | `https://snowtime.snowhound.eu` |
| `apiKey`          | `password`  | Yes      | None                            |
| `suggestionRange` | `dropdown`  | No       | Today and yesterday             |

- Raycast asks for required preferences before a command first runs, and stores a
  `password` preference encrypted. The Store forbids a separate setup command, and an
  extension may not use the Keychain.
- `instanceUrl` lets the extension work against a self-hosted Snowtime at any address. The
  client appends `/api/v1` and tolerates a trailing slash.
- The README and the preference descriptions say where to create the key and which scope
  each command needs: `read` for Recent Entries and the menu bar, `write` to start and stop.
- Running Timer has one command preference of its own: `showStartAgain` (a `checkbox`,
  labeled Show Start Again, on by default) shows the menu's Start Again section, the five
  recent entries, or hides it for a shorter menu (decided 2026-10-03).
- Recent Entries has one too: `mergeTickets` (a `checkbox`, titled Merge Tickets, off by
  default) shows a day's entries with the same ticket as one row, named by the newest, with
  their count and total time. Entries without a ticket always stay their own rows. The
  row's actions act on the running entry if the row holds it, else on the newest, and Show
  Entries (`⌘E`) pushes a list of its entries, since a Raycast list can't expand a row in
  place (decided 2026-10-03).
- `suggestionRange` (titled Suggestions From) sets how far back Start Timer looks for
  entries to suggest: Today and yesterday, Last 7 days, or Last 14 days ("Starting and
  continuing").

## Errors

The API answers `{ "error": { "code", "message" } }`, with an English message
(`docs/api.md`, "Errors"). `src/api/` turns every failure into one `ApiError` with the
status, code, and message, and the commands show it as a failure toast:

| Answer           | Toast message                                       | Action on the toast        |
| ---------------- | --------------------------------------------------- | -------------------------- |
| `401`            | The API's message                                   | Open Extension Preferences |
| `403` on a write | The API's message (`API key is read-only.`)         | Open Snowtime Settings     |
| `429`            | The API's message, and the wait `Retry-After` gives | None                       |
| No answer        | `Can't reach <host>.`                               | Open Extension Preferences |
| Any other        | The API's message                                   | None                       |

The extension shows the API's message instead of writing its own, so the words are the
same in every client. A request unanswered after 15 seconds counts as no answer. Open
Snowtime Settings opens the organization's settings page, `<instanceUrl>/<slug>/settings`,
where the API keys are.

## Organizations

A key acts in every organization its user belongs to (`GET /api/v1/me`). The extension
works in one at a time:

- It remembers the chosen organization's id in Raycast's `LocalStorage`, so every command
  and the menu bar agree.
- Without a choice, or when the user has left the remembered one, it takes the first by
  name, as `GET /api/v1/me` sorts them.
- The timer form offers a `Form.Dropdown`, and Recent Entries a `List.Dropdown` in the search
  bar. Both are hidden when the user has one organization.
- The running timer belongs to the organization it was started in, so stopping it needs no
  choice.

## Starting a timer

The extension generates the entry's id as a UUID v7, as `POST /api/v1/orgs/:orgId/timer`
asks. When a start gets no answer, it retries once with the same id. If the retry answers
`409`, the first request may have succeeded, so the extension reads `GET /api/v1/timer`: a
running entry with that id counts as started. It doesn't match the message text, which the
API may change.

## The menu bar

The Running Timer command is a `MenuBarExtra` whose title is the elapsed time as `h:mm`,
counted on the client from `startedAt`, as Snowtime counts it. Raycast runs a menu bar
command in the background at most once a minute (`interval`: `1m`, its minimum), so the
title moves by the minute.

The menu bar reads the API at most every 5 minutes in the background (decided
2026-10-03). Reading `GET /api/v1/timer` every minute would cost each user 1,440 requests a
day, and Snowtime verifies the key of each with one database read and two writes (Snowtime
task 082, README point 4). Instead:

- A command that starts or stops a timer writes the result to a `Cache` entry and
  refreshes the menu bar with `launchCommand` in the background, so the menu bar changes at
  once. A stop clears the cache before its request, and puts the timer back if the request
  fails, so the menu bar doesn't wait for the API.
- Such a refresh passes `fromCache` in its launch context, and the menu bar then shows the
  cache without reading the API: a read before the stop finished would bring the timer back.
- The menu's Start Again, Stop Timer, and Refresh run in the menu's own run and keep
  `isLoading` true until they finish, so Raycast doesn't unload the command when the click
  closes the menu. The menu shows the result itself: a command can't launch itself, so the
  refresh Start and Stop ask for doesn't reach it. In the menu bar, failures show as a HUD,
  since there is no window for a toast.
- A background run reads the cache and counts the elapsed time; every fifth run reads the
  timer and the Start Again entries from the API instead. A run reads the API too when
  nothing is cached yet.
- Opening the menu, and running Running Timer from Raycast's search, show the cache and
  send no request (decided 2026-10-03). Raycast opens the menu as the previous run drew it
  and doesn't redraw it while it is open, so a read on opening could only change the title
  under an unchanged menu. Opening and closing the menu a few times would also reach the
  API's rate limit, as each read of the Start Again entries is three requests.

A timer started or stopped in the web app then shows in the menu bar within 5 minutes.
That is 288 background requests a day per user for the timer, and as many reads of the
Start Again entries. If point 4 makes requests cheap, the menu bar can read the API every
minute.

Refreshing on request covers the time between: the menu has a Refresh item (`⌘R`), which
reads the timer and the Start Again entries and shows them at once. A menu reopened
before the API answers still shows the old state, as the cache changes only with the
answer; that is accepted (decided 2026-10-03), and the next open shows it. Recent Entries has a
Refresh action (`⌘R`) as well. A separate refresh command would only repeat the menu's
Refresh, so there is none.

## Starting and continuing

Start Timer is a list whose search bar is the description (decided 2026-10-03). Raycast's
`Form.TextField` can't suggest values, and a list can:

- Its rows are suggestions: the user's entries in the chosen organization since the start
  of the range `suggestionRange` sets, one row per description, ticket, and project at its
  newest entry, grouped by day. Typing filters them by description, ticket, and project.
  The list filters them itself instead of with Raycast's fuzzy filtering, so it knows
  whether anything matched and can title the New timer row's section only then.
- An entry whose project has since been archived or deleted starts again without one, as
  the API refuses a timer on an inactive project. `GET /api/v1/orgs/:orgId/projects` lists
  only active projects, so Recent Entries can't name such a project and says "Archived
  project".
- ↵ on a suggestion starts a new timer with its description, ticket, and project at once.
  ⌘↵ (Edit and Start) pushes the timer form, prefilled from it.
- While the user types, a last row, New timer, holds the typed text. With no match it is
  the only row, so ↵ pushes the timer form with the text as the description, a ticket key
  at its start split off by the rules in "Tickets from the description", and the
  remembered project.
- The list reads the range once per open, through `useCachedPromise`, so a second open
  shows the last suggestions at once.

The timer form asks for the description, ticket, project, and organization. Continue Timer
opens it prefilled from the running entry, or from the newest entry when none runs, so the
user can change anything before starting; with no entries at all, it opens empty. Start
Timer's list and Recent Entries' Edit and Start push it. One form component
(`src/components/`) serves them all.

The project is remembered between timers, because people often work on one project for a
while (decided 2026-10-03):

- Starting a timer from any command saves its organization and project in `LocalStorage`.
- The timer form preselects the saved project when Start Timer pushes it with typed text,
  and when Continue Timer has no entry to continue. A prefilled entry's own project wins.
- Changing the organization clears the saved project, and the form falls back to No
  project. So does a saved project the organization has since archived or deleted, because
  `GET /api/v1/orgs/:orgId/projects` lists only active ones.
- The Project field's `info` says the choice is remembered.

## Tickets from the description

When the user leaves Ticket empty, the form takes a ticket key from the description on
submit, as Snowtime's web app does when a description is committed (decided 2026-10-03). It
uses Snowtime's rules from `src/lib/tickets.ts`, ported with their tests: a key at the start,
optionally in brackets, becomes the ticket and leaves the description; a key later in the
text becomes the ticket and stays in the text. A ticket the user typed is never replaced.
The Ticket field's `info`, an ⓘ with a tooltip, says so, so the rule doesn't surprise anyone
without taking space in the form.

## Language and formats

Raycast supports only US English, so the extension does too, and doesn't translate.

- Times and dates use `en-US` formats in the Mac's time zone (`9:30 AM`, `Monday, Oct 5`).
  The API doesn't send the user's Snowtime time zone, so a day is the Mac's day.
- Durations are `h:mm`, as in the menu bar.
- A description is optional, so an entry is named as Snowtime's `entryLabel` names it
  (`src/features/timer/entries.ts` there): by its description, else its ticket, else "No
  description". A list shows the ticket as a tag only when the description names the entry,
  so it doesn't appear twice. A HUD quotes a description, names a bare ticket as is, and
  says "a timer" or "the timer" when there is neither ("Started WEB-15", "Stopped the timer
  at 1:37").
- Titles of commands, actions, and sections use Title Case; descriptions and toasts use
  sentence case.

## Raycast Store rules

The extension follows Raycast's
[Store guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).
Those that shape the design:

- `author` is the publisher's Raycast username (`kustav_prants`), and `license` is `MIT`.
- The icon is a 512 × 512 PNG that works in light and dark: `assets/extension-icon.png`,
  with `extension-icon@dark.png` beside it.
- Command titles are `<verb> <noun>` or `<noun>` in Title Case, without articles: Start
  Timer, Continue Timer, Stop Timer, Recent Entries, Running Timer.
- Configuration goes in preferences; there is no setup command.
- Every list has an empty view and shows `isLoading` until data arrives, so the empty view
  doesn't flash. Every search bar and text field has a placeholder.
- Actions use Title Case and an icon. Screens are pushed through Raycast's navigation, never
  an own stack, and the root command keeps its `navigationTitle`.
- No analytics and no Keychain access.
- `README.md` explains the setup, because it needs an API key. Screenshots go in
  `metadata/`: three to six PNGs at 2000 × 1250. `CHANGELOG.md` uses
  `## [Title] - {PR_MERGE_DATE}`.
- The `owner` field stays unset: it would publish the extension privately to an
  organization's Raycast team instead of the public Store.

## Repository and publishing

The repository is private on the user's GitHub account until the Snowhound organization
can take it; a transfer keeps its history and redirects the old URL. The Store builds from a
pull request to `raycast/extensions`, which copies the extension into that monorepo. This
repository stays the source of truth, and each release is a new pull request there.
