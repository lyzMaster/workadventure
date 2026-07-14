# Standalone Runtime Architecture

This repository runs as a backend-free browser runtime centered on the standalone scene flow in `play/`.

## Core Components

### `StandaloneGameScene`

- Location: `play/src/standalone/runtime/StandaloneGameScene.ts`
- Responsibility: owns Phaser scene bootstrapping, TMJ/WAM loading, collision setup, scene lifecycle, and runtime wiring

### `LocalPlayer` / `AgentCharacter`

- Location: `play/src/standalone/characters/`
- Responsibility: local character runtime, animation, movement, facing, speaking, and agent orchestration

### `FurnitureRuntimeController`

- Location: `play/src/standalone/furniture/FurnitureRuntimeController.ts`
- Responsibility: placed-furniture lifecycle, selection, editing, undo/redo integration, and runtime application of map-editor DTOs

### `WorldCommandGateway`

- Location: `play/src/standalone/commands/WorldCommandGateway.ts`
- Responsibility: single command entrypoint for scene, agent, and furniture actions; idempotency, cancellation, timeout, and result/event flow

### `SceneOverlay`

- Location: `play/src/standalone/SceneOverlay.ts`
- Responsibility: local overlay state merged on top of checked-in scene assets without requiring backend services

## Supporting Layers

- `StandaloneSceneRegistry` resolves the checked-in scene list.
- `StandaloneSceneController` handles scene switching and asset resolution.
- `IndexedDBSceneStorage` persists local scene overlay state in the browser.
- `libs/game-model` provides framework-agnostic domain types.
- `libs/world-command` defines command/result/event schemas.
- `libs/map-editor` provides WAM/TMJ editor models and DTOs used by the runtime.

## Runtime Model

1. The app boots through `play/standalone.html`.
2. `src/standalone/main.ts` creates the standalone application shell.
3. `StandaloneSceneController` resolves `Home` or `Office` scene assets from `play/public/maps/`.
4. `StandaloneGameScene` loads the scene and wires player, agents, furniture, and overlay state.
5. All world mutations flow through `WorldCommandGateway`.
6. Local persistence is stored in IndexedDB; no backend, WebSocket, or online room service is involved.

## Non-Goals In This Repo

- No online multiplayer runtime
- No Electron desktop shell
- No Docker/Helm/self-hosting stack
- No iframe scripting API packaging
- No server-side scene persistence
