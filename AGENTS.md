# AGENTS.md - WorkAdventure Monorepo

WorkAdventure is now maintained in this workspace as a Vite standalone TypeScript application.

## Instruction scope

- The closest `AGENTS.md` to a changed file takes precedence.
- Directories without their own `AGENTS.md` inherit this file and the shared guides below.
- Package scripts are the source of truth when a documented command drifts.
- Run package scripts from that package's directory unless the command explicitly uses `--workspace`.
- Before modifying code, read the root-level `项目源码分析.md` first to understand the project's source-code logic and architecture context.

## Main projects

- `play/AGENTS.md`: Svelte/Phaser standalone frontend.
- `messages/AGENTS.md`: protobuf sources and generated TypeScript.
- `libs/AGENTS.md`: shared `@workadventure/*` libraries.
- `tests/AGENTS.md`: legacy Playwright end-to-end tests.

## Shared guidance

- `docs/agent/dev-setup.md`
- `docs/agent/lint-format.md`
- `docs/agent/testing-vitest.md`
- `docs/agent/typescript-style.md`
- `docs/agent/error-handling.md`
- `docs/agent/svelte.md`
- `docs/agent/i18n.md`
- `docs/agent/common-issues.md`
- `docs/agent/devtools.md`
