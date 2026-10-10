# 004: Store release

Status: in-progress

Ready the extension for the Raycast Store and submit it, as the Store guidelines and
`docs/architecture/README.md` ("Raycast Store rules") ask. Snowtime task 082, subtask 05,
calls submitting a follow-up, so this waits until the commands are done and used for a
while.

## Acceptance criteria

- [x] `extension/README.md` explains what the extension does, how to create an API key
      and which scope each command needs, and how to point it at a self-hosted instance
- [x] `extension/metadata/` holds three to six 2000 × 1250 PNG screenshots of the
      commands with fictional data, all in one theme
- [x] `extension/CHANGELOG.md` lists the first version under
      `## [Initial Version] - {PR_MERGE_DATE}`
- [x] `extension/package.json` has the final title, description, keywords, and
      categories
- [x] `extension/help.md` explains the setup beside Raycast's preferences form, and the
      README opens with the icon
- [x] `@raycast/api` is the latest, 2.7.3, and `react-dom` stays at the React version it
      brings, 19.0.0; the code uses `environment.entryPointName` and `entryPointMode`
      instead of the names Raycast 2.0 deprecated
- [x] The extension sits in `extension/`, so `npm run publish` leaves the docs, tasks,
      prototypes, and agent files out of `raycast/extensions`
- [x] `npm run build` and `npm run lint` pass, also in CI on every push
- [x] The repository is moved to the Snowhound organization, and Snowtime's `docs/api.md`
      links to it
- [ ] `npm run publish` opens the pull request to `raycast/extensions`, and its review is
      answered until it merges
- [ ] That pull request adds `snowtime` to `.github/public_raycast_extensions.txt` and
      says why, since `raycast/extensions` fails an extension with an `owner` that isn't on
      the list (`docs/architecture/README.md`, "Raycast Store rules")
