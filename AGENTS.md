# Agent rules

## Project context

- Product scope: `docs/product.md`
- Local setup and scripts: `docs/development.md`
- Architecture decisions: `docs/architecture/`
- Task tracking: `tasks/` (see `tasks/README.md`)
- Writing docs: `.claude/skills/google-style/SKILL.md`
- The Snowtime HTTP API this extension calls: `docs/api.md` in the Snowtime repository

Follow the recorded decisions; if a change contradicts one, update the doc in the same
change or ask first.

## Shared skills

Codex discovers the writing skill through a symlink in `.agents/skills/`. Edit its source
file at the path above so both agents use the same instructions.

## Commits

- One or two lean sentences, imperative mood.
- No body, no `Co-Authored-By` or any other trailers.
