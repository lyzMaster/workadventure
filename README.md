# WorkAdventure Standalone Pixel World Runtime

This repository has been narrowed from the original WorkAdventure fork to a standalone browser runtime for pixel-world
scenes. It runs without backend services and focuses on local scene loading, character runtime, furniture editing, and
world commands.

## Features

- Standalone browser runtime with `Home` and `Office` seed scenes
- `LocalPlayer` and local `AgentCharacter` runtime
- Furniture placement, selection, move, variant switch, delete, undo, and redo
- `WorldCommandGateway` orchestration for scene, agent, and furniture commands
- IndexedDB-backed local scene persistence
- No backend requests, no WebSocket dependency, no online room services

## Directory Structure

- `play/`: standalone app, Phaser runtime, Svelte UI, tests, and public assets
- `libs/game-model/`: framework-agnostic character and appearance domain types
- `libs/world-command/`: command, result, event, and schema definitions
- `libs/map-editor/`: WAM/TMJ map model helpers and editor DTOs
- `libs/math-utils/`: geometry helpers
- `libs/shared-utils/`: small shared utilities still used by standalone code
- `docs/architecture.md`: current runtime architecture overview

## Install

```bash
npm ci
```

## Development

From the repo root:

```bash
npm run dev:standalone
```

Or from `play/`:

```bash
cd play
npm run dev:standalone
```

The default entry is `http://localhost:5173/standalone.html`.

## Build

```bash
npm run build:standalone
```

## Test

```bash
npm run typecheck:standalone
npm test -- --run
npm run test:e2e:standalone
```

## Architecture Overview

The runtime centers on:

- `StandaloneGameScene`
- `LocalPlayer` and `AgentCharacter`
- `FurnitureRuntimeController`
- `WorldCommandGateway`
- `SceneOverlay`
- local, backend-free scene loading and persistence

See [docs/architecture.md](docs/architecture.md) for the current component map.

## Current Limits

- Browser-only runtime; no Electron desktop shell in this repo
- No online multiplayer, WebRTC, Matrix, iframe scripting API, Docker, or self-hosting stack
- No AppWorld persistence, Swift/WKWebView bridge, iCloud sync, LLM/tool-calling integrations
- Scene seeds are the checked-in `Home` and `Office` maps under `play/public/maps/`

## License Notes

- Runtime code in `play/` is licensed as described in `play/LICENSE.txt`.
- Keep third-party license files shipped with fonts, maps, and art assets intact.
- This repo preserves upstream license context but is now scoped to the standalone runtime only.
