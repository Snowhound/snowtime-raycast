# Development

## Getting started

Needs Node 22.22 or later and the Raycast app. The extension is in `extension/`, and every
`npm` command runs there.

```sh
cd extension
npm install
npm run dev
```

`npm run dev` (`ray develop`) adds the extension to Raycast and rebuilds it on every save.
On the first run of a command, Raycast asks for the preferences
([architecture](architecture/README.md), "Sign-in and preferences").

## Against a local Snowtime

1. Start Snowtime in its repository (`bun --bun run dev`, on `http://localhost:3000`).
2. Sign in as a seeded user, such as `noah@example.com` with the password `snowtime-local`,
   and create a key under Settings → API keys. A `write` key runs every command.
3. In Raycast, open the extension's preferences and set Instance URL to
   `http://localhost:3000` and API Key to the key.

Noah has no running timer, so starting and stopping one leaves the other seeded users'
timers alone.

## Checking a command

`npm test` covers every command against stand-ins for Raycast and Snowtime
([architecture](architecture/README.md), "Tests"). They can't show how Raycast draws a
view, and Raycast can't be driven by an agent, so a person checks each command in Raycast
before its task is done: every state its prototype shows, in light and dark, and against
the local Snowtime. The prototypes are checked by agents first
(`docs/skills/ui-review/SKILL.md`).

## Scripts

| Command            | Does                                                        |
| ------------------ | ----------------------------------------------------------- |
| `npm run dev`      | Runs the extension in Raycast and rebuilds it on save       |
| `npm run build`    | Builds the extension as the Store will                      |
| `npm run lint`     | `ray lint`: the manifest, the icons, ESLint, and Prettier   |
| `npm test`         | Type-checks the tests, then runs them all in Europe/Tallinn |
| `npm run fix-lint` | `ray lint --fix`                                            |
| `npm run publish`  | Opens the pull request to `raycast/extensions` (task 004)   |
