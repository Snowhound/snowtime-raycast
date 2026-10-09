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
| Tests      | Vitest for every module and command, against stand-ins for Raycast and Snowtime ("Tests")                              |
| Prototypes | Static HTML in `prototypes/`, approved before a command is built (`prototypes/README.md`)                              |

The only other runtime dependency is `uuid`, for UUID v7 entry ids.

## The Snowtime API is the only backend

The extension calls only Snowtime's `/api/v1`, whose contract is `docs/api.md` in the
Snowtime repository. It reads no Snowtime page, cookie, or server function, so it tests the
public API the way any client would, and keeps working while Snowtime's backend moves to
Rust (Snowtime task 081). A feature the API lacks is added to the API first.

## Code layout

The extension lives in `extension/` ([Repository and publishing](#repository-and-publishing)),
and this doc gives the paths of its files relative to that folder.

Each folder holds one kind of code, so its name says where to look (decided 2026-10-09):

| Path                | Holds                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `src/<command>.tsx` | One file per command, named as in `package.json`, as Raycast requires                        |
| `src/api/`          | The API client, its types and errors, and `load-recent.ts`, which reads recent entries       |
| `src/timer/`        | Starting and stopping a timer from any command, and the timer cache the menu bar reads       |
| `src/settings/`     | The remembered organization and project, and the Time Format preference                      |
| `src/components/`   | Views and actions more than one command uses: the timer form, the entry actions, error views |
| `src/hooks/`        | React hooks, such as `useElapsed`, which moves a running timer's minutes                     |
| `src/lib/`          | Code that imports nothing from Raycast: formatting, names, rows, tickets, the menu's rules   |
| `src/test/`         | The tests' stand-ins for `@raycast/api` and Snowtime, and their helpers                      |

A command file only wires its view. Start Timer and Recent Entries take their entry
actions from `components/entry-actions.tsx`, so both name, icon, and bind them alike.
Logic without UI goes to `src/lib/`, where tests need no stand-ins. `lib/format.ts` reads
the Time Format preference through `settings/`, the one way into Raycast from `lib/`.

## Sign-in and preferences

The extension signs in with a personal API key that the user creates in Snowtime under
Settings → API keys. Four extension preferences, which every command shares:

| Preference        | Type        | Required | Default                         |
| ----------------- | ----------- | -------- | ------------------------------- |
| `instanceUrl`     | `textfield` | Yes      | `https://snowtime.snowhound.eu` |
| `apiKey`          | `password`  | Yes      | None                            |
| `suggestionRange` | `dropdown`  | No       | Today and yesterday             |
| `timeFormat`      | `dropdown`  | No       | System Default                  |

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

A refusal of the API's rules answers `{ "error": { "code", "key" } }`, where the key, such
as `timer_not_running`, names the message. A refusal of the key itself and invalid input
answer an English `message` instead (`docs/api.md`, "Errors"). `src/api/` turns every
failure into one `ApiError` with the status, code, key, and message, and the commands show
it as a failure toast:

| Answer           | Toast message                                       | Action on the toast        |
| ---------------- | --------------------------------------------------- | -------------------------- |
| `401`            | The API's message                                   | Open Extension Preferences |
| `403` on a write | The API's message (`API key is read-only.`)         | Open Snowtime Settings     |
| `429`            | The API's message, and the wait `Retry-After` gives | None                       |
| No answer        | `Can't reach <host>.`                               | Open Extension Preferences |
| Any other        | The key's message, or else the API's message        | None                       |

The extension words a key as the web app does: `src/api/errors.ts` copies the English text
of each key its calls can answer from `errorMessages` in the Snowtime repository's
`src/server/errors.ts`. A key added after that copy falls back to
`Snowtime answered <status>.`, so update the copy when Snowtime adds a key the extension's
calls can answer. A request unanswered after 15 seconds counts as no answer. Open
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

The extension generates the entry's id as a UUID v7, as
`POST /api/v1/organizations/:orgId/timer/start` asks. When a start gets no answer, it
retries once with the same id. If the retry answers `409`, the first request may have
succeeded, so the extension reads `GET /api/v1/timer`: a running entry with that id counts
as started. It doesn't match the refusal's key, since a `409` has more than one cause.

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
  the API refuses a timer on an inactive project.
  `GET /api/v1/organizations/:orgId/projects` lists only active projects, so Recent Entries
  can't name such a project and says "Archived project".
- ↵ on a suggestion starts a new timer with its description, ticket, and project at once.
  ⌘↵ (Edit and Start) pushes the timer form, prefilled from it.
- While the user types, a last row, New timer, holds the typed text. With no match it is
  the only row, so ↵ pushes the timer form with the text as the description, a ticket key
  at its start split off by the rules in "Tickets from the description", and the
  remembered project.
- New Timer (`⌘N`), in every row's actions and the empty view, opens the timer form as the
  New timer row does: with the typed text, or empty when nothing is typed, and the
  remembered project. So the user can start a new timer without typing first, and with
  text typed, `⌘N` skips the matching suggestions. On the New timer row, `⌘N` runs the
  row's own Edit and Start (decided 2026-10-09).
- While a suggestion is the running timer, every row has Stop Timer (`⌘S`) in a Running
  Timer section, as in Recent Entries. ↵ on the running row stays Start Again, since the
  command is for starting (decided 2026-10-09).
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
  `GET /api/v1/organizations/:orgId/projects` lists only active ones.
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
- Times are 12- or 24-hour as the `timeFormat` preference (Time Format) chooses: System
  Default, 12-hour, or 24-hour (`09:30`; decided 2026-10-03). System Default takes the hour
  cycle of the locale the extension runs in, from `Intl`, which in Raycast follows the Mac's
  region (checked 2026-10-03). Extensions in `raycast/extensions` that offer the choice do it
  this way, as `in-the-time-zone` does; none reads macOS's settings. The tests pin 12-hour
  time (`vitest.setup.ts`).
- Durations are `h:mm`, as in the menu bar.
- A description is optional, so an entry is named as Snowtime's `entryLabel` names it
  (`src/features/timer/entries.ts` there): by its description, else its ticket, else "No
  description". A list shows the ticket as a tag only when the description names the entry,
  so it doesn't appear twice. A HUD quotes a description, names a bare ticket as is, and
  says "a timer" or "the timer" when there is neither ("Started WEB-15", "Stopped the timer
  at 1:37").
- Titles of commands, actions, and sections use Title Case; descriptions and toasts use
  sentence case.

## Tests

Every command has tests, beside it as `<command>.test.tsx` (decided 2026-10-09). They
render the command and use it as a person would: they find rows by title, run actions by
name, and type in the search bar and the form. Then they check what reached Snowtime and
what Raycast was asked to show. Two stand-ins in `src/test/` make that possible outside
Raycast:

- `raycast-api.tsx` replaces `@raycast/api` (`vitest.config.mts` aliases it). Its
  components draw plain HTML that Testing Library queries: a row is a `listitem` named by
  its title, an action a `button`, a field a control named by its title. It records HUDs,
  toasts, launches, opened URLs, and copies, and keeps `Cache` and `LocalStorage` in
  memory, with a `Cache` namespace per store as Raycast keeps them.
- `snowtime.ts` answers `fetch` as `/api/v1` does in Snowtime's `docs/api.md`, from data
  each test sets up, and can fail a request or go offline.

The real `@raycast/utils` runs on the stand-in, inlined so that its own imports reach it,
so the tests also cover how the commands use `useCachedPromise` and `useForm`. The clock
is fixed at the prototypes' moment, Monday 5 October 2026, 10:42 in Tallinn, so durations
and day titles are exact.

The stand-in can't show how Raycast draws a view, so a person still checks each command in
Raycast (`docs/development.md`, "Checking a command"). The tests are type-checked with
`tsconfig.test.json`, which adds the DOM types the main `tsconfig.json` leaves out of the
extension. `react-dom` is pinned to the React version `@raycast/api` brings; an upgrade of
`@raycast/api` that moves React moves it too.

## Raycast Store rules

The extension follows Raycast's
[Store guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).
Those that shape the design:

- `author` is the publisher's Raycast username (`kustav_prants`), and `license` is `MIT`.
- `owner` is the Raycast organization `snowhound`, and `access` is `public`, so the
  extension is listed in the public Store rather than only inside the organization.
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

## Repository and publishing

The repository is public at
[Snowhound/snowtime-raycast](https://github.com/Snowhound/snowtime-raycast). The Store
builds from a pull request to `raycast/extensions`, which copies the extension into that
monorepo. This repository stays the source of truth, and each release is a new pull
request there.

The extension sits in `extension/`, and the docs, tasks, prototypes, and agent
instructions sit beside it at the root. `ray publish` copies the whole directory it runs
from, skipping only `.git`, `node_modules`, and generated files, and reads no ignore list.
Running it from `extension/` keeps everything else out of `raycast/extensions`. A script
that copies selected files to a temporary folder was rejected: `ray publish` and
`pull-contributions` write reviewers' edits back into the folder they run from, so the
edits would land outside this repository.
