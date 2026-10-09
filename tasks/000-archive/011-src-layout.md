# 011: A source layout that says what each file is

Status: done

Folder and file names in `extension/src/` don't say what they hold: `components/` has the
start and stop flows and a hook, `lib/` mixes pure code with code that uses Raycast's
storage and the API, and `lib/menu.ts` and `lib/menu-bar.ts` can't be told apart. Start
Timer and Recent Entries build the same actions twice. The change moves and renames
without changing behavior, so the tests pass unchanged.

## Acceptance criteria

- [x] The start and stop flows and the timer cache are in `timer/`, the remembered
      organization and project and the Time Format preference in `settings/`, the hook in
      `hooks/`, the failure toast in `components/`, and loading recent entries in `api/`
- [x] No file in `lib/` imports `@raycast/api`
- [x] How an entry is named in text (`entries.ts`, `hud.ts`, `continue.ts`) is one file,
      `lib/names.ts`
- [x] Start Timer and Recent Entries share their entry actions from
      `components/entry-actions.tsx`, and `lib/rows.ts` has the helpers they repeated
- [x] `docs/architecture/README.md` ("Code layout") describes the layout
- [x] `npm test`, `npm run lint`, and `npm run build` pass
