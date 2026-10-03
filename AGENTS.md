# Agent rules

## Project context

- Product scope: `docs/product.md`
- Local setup and scripts: `docs/development.md`
- Architecture decisions: `docs/architecture/`
- Task tracking: `tasks/` (see `tasks/README.md`)
- Writing docs: `.claude/skills/google-style/SKILL.md`
- UI prototypes: `prototypes/` (see `prototypes/README.md`); a command is built only from
  an approved prototype. Browser checks via `docs/skills/ui-review/SKILL.md`
- The Snowtime HTTP API this extension calls: `docs/api.md` in the Snowtime repository

Follow the recorded decisions; if a change contradicts one, update the doc in the same
change or ask first.

## Shared skills

Codex discovers the writing and UI review skills through symlinks in `.agents/skills/`.
Edit their source files at the paths above so both agents use the same instructions.

## Commits

- One or two lean sentences, imperative mood.
- No body, no `Co-Authored-By` or any other trailers.
