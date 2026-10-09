# 004: Store release

Status: in-progress

Ready the extension for the Raycast Store and submit it, as the Store guidelines and
`docs/architecture/README.md` ("Raycast Store rules") ask. Snowtime task 082, subtask 05,
calls submitting a follow-up, so this waits until the commands are done and used for a
while.

## Acceptance criteria

- [x] `extension/README.md` explains what the extension does, how to create an API key
      and which scope each command needs, and how to point it at a self-hosted instance
- [ ] `extension/metadata/` holds three to six 2000 × 1250 PNG screenshots of the
      commands with fictional data, all in one theme
- [x] `extension/CHANGELOG.md` lists the first version under
      `## [Initial Version] - {PR_MERGE_DATE}`
- [ ] `extension/package.json` has the final title, description, keywords, and
      categories, and the latest `@raycast/api`, with `react-dom` at the React version it
      brings
- [x] The extension sits in `extension/`, so `npm run publish` leaves the docs, tasks,
      prototypes, and agent files out of `raycast/extensions`
- [ ] `npm run build` and `npm run lint` pass
- [x] The repository is moved to the Snowhound organization, and Snowtime's `docs/api.md`
      links to it
- [ ] `npm run publish` opens the pull request to `raycast/extensions`, and its review is
      answered until it merges
