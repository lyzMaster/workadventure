# Contributing

This repository now targets the standalone pixel-world runtime only. Keep changes focused, avoid reviving deleted
online-stack concepts, and prefer small, verifiable pull requests.

## Before You Open a PR

Run the authoritative gates from the repo root:

```bash
npm ci
npm run typecheck:standalone
npm test -- --run
npm run build:standalone
npm run test:e2e:standalone
```

## Scope Rules

- Do not add new backend, WebSocket, Docker, Helm, Matrix, WebRTC, or iframe-API dependencies.
- Route world mutations through `WorldCommandGateway`; do not bypass it with ad-hoc runtime state writes.
- Keep core schemas stable unless the change explicitly targets them.
- Preserve checked-in legal files and asset license texts.

## Tests

- Add or update Vitest coverage for runtime logic changes.
- Add or update Playwright coverage for scene-loading, player, agent, or furniture workflows when behavior changes.
- Prefer regression tests for bug fixes.

## Docs

- Update `README.md` and `docs/architecture.md` when the standalone runtime shape changes materially.
- Keep developer instructions aligned with actual package scripts.
