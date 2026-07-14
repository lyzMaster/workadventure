# AGENTS.md - play/

Svelte/Phaser standalone frontend.

## Areas

- `src/front/`: retained shared Phaser/map-editor building blocks still used by standalone runtime.
- `src/standalone/`: Vite standalone bootstrap, scene registry, local storage, and local map edit transport.
- `src/i18n/`: translation modules.
- `tests/`: standalone Vitest and Playwright coverage.

## Common commands

```bash
cd play

npm run dev:standalone
npm run typecheck:standalone
npm test -- --run
npm run build:standalone
npm run test:e2e:standalone
```

Prefer the standalone gates over ad-hoc commands during validation.

Run a focused unit test once:

```bash
cd play
npm test -- --run tests/front/Standalone/WorldCommand/WorldCommandGateway.test.ts
```

## Frontend conventions

- New and migrated Svelte components use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`).
- Match the translation import style and UI patterns of neighboring components.
- Event listeners and subscriptions must have explicit cleanup. ESLint checks listener removal and ignored subscriptions.
- For Phaser or media behavior, test actual runtime state rather than relying only on rendered DOM state.
- Do not assume old iframe API, online room, or Docker-based entrypoints still exist in this package.

## Related guides

- `../docs/agent/testing-vitest.md`
- `../docs/agent/svelte.md`
- `../docs/agent/i18n.md`
- `../docs/agent/typescript-style.md`
- `../docs/agent/devtools.md`
