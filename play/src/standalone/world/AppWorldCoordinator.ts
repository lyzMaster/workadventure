import {
    playerSnapshotToPersisted,
    runtimePositionToPersisted,
    type PersistedAgentState,
    type PersistedSceneState,
} from "@workadventure/app-world";
import type { AgentCharacterSnapshot, CharacterSnapshot } from "@workadventure/game-model";
import type { WorldCommand, WorldCommandResult } from "@workadventure/world-command";
import { DEFAULT_STANDALONE_SCENE_ID } from "../StandaloneSceneRegistry";
import type { AppWorldSceneRef, AppWorldRepository, AppWorldPersistenceState } from "./AppWorldRepository";
import type {
    RestoreDiagnostic,
    RestoreResult,
    ScenePersistenceRuntime,
} from "./ScenePersistenceRuntime";

export interface AppWorldBootstrapResult {
    initialSceneId: string;
    created: boolean;
    diagnostics: readonly { code: string; message: string }[];
}

export interface AppWorldFlushResult {
    appWorldSaved: boolean;
    sceneOverlaySaved: boolean;
    revision: number;
    savedAt?: string;
    error?: {
        code: string;
        message: string;
        details: Record<string, unknown>;
    };
}

export interface AppWorldCoordinatorOptions {
    now?: () => Date;
}

export class AppWorldCoordinator {
    private readonly sceneRefs = new Map<string, AppWorldSceneRef>();
    private activeRuntime: ScenePersistenceRuntime | null = null;
    private activeSceneRef: AppWorldSceneRef | null = null;
    private restoring = false;
    private restoreDiagnostics: RestoreDiagnostic[] = [];

    public constructor(
        private readonly repository: AppWorldRepository,
        scenes: readonly AppWorldSceneRef[],
        private readonly options: AppWorldCoordinatorOptions = {},
    ) {
        for (const scene of scenes) {
            this.sceneRefs.set(scene.sceneId, scene);
        }
    }

    public async bootstrap(input: { urlSceneId?: string | null; legacySceneId?: string | null }): Promise<AppWorldBootstrapResult> {
        const loadResult = await this.repository.load();
        const created = loadResult.snapshot === null;
        if (loadResult.snapshot) {
            this.repository.initialize(loadResult.snapshot, { diagnostics: loadResult.diagnostics });
        } else {
            const activeSceneId = this.resolveValidSceneId(input.legacySceneId) ?? DEFAULT_STANDALONE_SCENE_ID;
            this.repository.initialize(this.createEmptySnapshot(activeSceneId), {
                markDirty: true,
                diagnostics: loadResult.diagnostics,
            });
            await this.repository.flush();
        }

        return {
            initialSceneId:
                this.resolveValidSceneId(input.urlSceneId) ??
                this.resolveValidSceneId(this.repository.getSnapshot()?.activeSceneId) ??
                this.resolveValidSceneId(input.legacySceneId) ??
                DEFAULT_STANDALONE_SCENE_ID,
            created,
            diagnostics: loadResult.diagnostics.map((diagnostic) => ({
                code: diagnostic.code,
                message: diagnostic.message,
            })),
        };
    }

    public async bindRuntime(runtime: ScenePersistenceRuntime): Promise<RestoreDiagnostic[]> {
        const sceneRef = this.requireSceneRef(runtime.sceneId);
        this.activeRuntime = runtime;
        this.activeSceneRef = sceneRef;
        this.restoring = true;
        this.restoreDiagnostics = [];
        try {
            const snapshot = this.repository.getSnapshot();
            const persistedScene = snapshot?.scenes[sceneRef.sceneId];
            if (!persistedScene) {
                this.restoring = false;
                return [];
            }

            if (persistedScene.player) {
                const playerResult = await runtime.restorePlayer(persistedScene.player);
                this.restoreDiagnostics.push(resultToDiagnostic(playerResult));
            }
            const agentStates = Object.values(persistedScene.agents).sort((a, b) =>
                a.characterId.localeCompare(b.characterId),
            );
            this.restoreDiagnostics.push(...(await runtime.restoreAgents(agentStates)));
            return [...this.restoreDiagnostics];
        } finally {
            this.restoring = false;
        }
    }

    public unbindRuntime(runtime: ScenePersistenceRuntime | null): void {
        if (runtime && this.activeRuntime?.sceneId !== runtime.sceneId) {
            return;
        }
        this.activeRuntime = null;
        this.activeSceneRef = null;
    }

    public async captureRuntime(runtime: ScenePersistenceRuntime): Promise<void> {
        const sceneRef = this.requireSceneRef(runtime.sceneId);
        this.capturePlayer(sceneRef, runtime.getPlayerSnapshot());
        this.captureAgents(sceneRef, runtime.listAgentSnapshots());
    }

    public capturePlayer(sceneRef: AppWorldSceneRef, player: CharacterSnapshot | null): void {
        this.repository.updatePlayer(
            sceneRef,
            player ? playerSnapshotToPersisted(player, this.timestamp()) : null,
        );
    }

    public captureAgents(sceneRef: AppWorldSceneRef, agents: readonly AgentCharacterSnapshot[]): void {
        const snapshot = this.repository.getSnapshot();
        const persistedScene = snapshot?.scenes[sceneRef.sceneId];
        if (!persistedScene) {
            return;
        }
        const updatedAt = this.timestamp();
        for (const agent of agents) {
            const persisted = persistedScene.agents[agent.id];
            if (!persisted) {
                continue;
            }
            this.repository.upsertAgent(sceneRef, {
                ...persisted,
                position: runtimePositionToPersisted(agent.position),
                updatedAt,
            });
        }
    }

    public onPlayerMovementSettled(snapshot: CharacterSnapshot): void {
        if (!this.activeSceneRef || this.restoring) {
            return;
        }
        this.capturePlayer(this.activeSceneRef, snapshot);
    }

    public async persistActiveSceneSelection(sceneId: string): Promise<void> {
        this.repository.setActiveScene(sceneId);
        await this.repository.flush();
    }

    public async handleCommandPersistence(command: WorldCommand, result: WorldCommandResult): Promise<null | {
        code: string;
        message: string;
        details: Record<string, unknown>;
    }> {
        if (result.status !== "succeeded" || !this.activeSceneRef) {
            return null;
        }

        const sceneRef = this.activeSceneRef;
        const savedAt = this.timestamp();

        switch (command.type) {
            case "agent.spawn": {
                const payload = command.payload;
                this.repository.upsertAgent(sceneRef, {
                    characterId: payload.characterId,
                    name: payload.name,
                    sceneId: payload.sceneId,
                    appearance: {
                        textures: payload.appearance.textures.map((texture) => ({
                            id: texture.id,
                            assetPath: texture.url,
                            layer: texture.layer,
                        })),
                    },
                    movementConfig: payload.movementConfig,
                    position: runtimePositionToPersisted(
                        ((result.data as AgentCharacterSnapshot | undefined)?.position ?? payload.spawnPosition),
                    ),
                    updatedAt: savedAt,
                });
                break;
            }
            case "agent.moveTo":
            case "agent.stop":
            case "agent.face": {
                const data = result.data as AgentCharacterSnapshot | undefined;
                if (!data) {
                    break;
                }
                const current = this.repository.getSnapshot()?.scenes[sceneRef.sceneId]?.agents[data.id];
                if (!current) {
                    break;
                }
                this.repository.upsertAgent(sceneRef, {
                    ...current,
                    position: runtimePositionToPersisted(data.position),
                    updatedAt: savedAt,
                });
                break;
            }
            case "agent.remove":
                this.repository.removeAgent(sceneRef, command.payload.characterId);
                break;
            default:
                return null;
        }

        await this.repository.flush();
        const state = this.repository.getPersistenceState();
        if (state.lastError) {
            return {
                code: "persistence_failed",
                message: state.lastError.message,
                details: {
                    runtimeApplied: true,
                    dirty: state.dirty,
                },
            };
        }
        return null;
    }

    public async flush(runtime: ScenePersistenceRuntime | null = this.activeRuntime): Promise<AppWorldFlushResult> {
        let sceneOverlaySaved = false;
        if (runtime) {
            await this.captureRuntime(runtime);
        }

        let overlayError: unknown;
        try {
            if (runtime) {
                await runtime.flushSceneOverlay();
            }
            sceneOverlaySaved = true;
        } catch (error) {
            overlayError = error;
        }

        await this.repository.flush();
        const persistenceState = this.repository.getPersistenceState();
        if (overlayError || persistenceState.lastError) {
            return {
                appWorldSaved: !persistenceState.lastError,
                sceneOverlaySaved,
                revision: persistenceState.revision,
                savedAt: persistenceState.lastSavedAt,
                error: {
                    code: "persistence_failed",
                    message: persistenceState.lastError?.message ?? toErrorMessage(overlayError),
                    details: {
                        appWorldSaved: !persistenceState.lastError,
                        sceneOverlaySaved,
                        dirty: persistenceState.dirty,
                    },
                },
            };
        }

        return {
            appWorldSaved: true,
            sceneOverlaySaved,
            revision: persistenceState.revision,
            savedAt: persistenceState.lastSavedAt,
        };
    }

    public getPersistenceSnapshot(): AppWorldPersistenceState & { restoring: boolean; restoreDiagnosticCount: number } {
        const state = this.repository.getPersistenceState();
        return {
            ...state,
            restoring: this.restoring,
            restoreDiagnosticCount: this.restoreDiagnostics.length,
        };
    }

    public getSceneState(sceneId: string): PersistedSceneState | null {
        return this.repository.getSnapshot()?.scenes[sceneId] ?? null;
    }

    private createEmptySnapshot(activeSceneId: string) {
        return {
            schemaVersion: 1 as const,
            worldId: this.repository.getWorldId(),
            revision: 0,
            activeSceneId,
            scenes: {},
            updatedAt: this.timestamp(),
        };
    }

    private requireSceneRef(sceneId: string): AppWorldSceneRef {
        const scene = this.sceneRefs.get(sceneId);
        if (!scene) {
            throw new Error(`Unknown scene "${sceneId}"`);
        }
        return scene;
    }

    private resolveValidSceneId(sceneId: string | null | undefined): string | null {
        return sceneId && this.sceneRefs.has(sceneId) ? sceneId : null;
    }

    private timestamp(): string {
        return (this.options.now ?? (() => new Date()))().toISOString();
    }
}

function resultToDiagnostic(result: RestoreResult): RestoreDiagnostic {
    return {
        code: result.code,
        message: result.message,
        applied: result.applied,
        position: result.position,
    };
}

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error ?? "Unknown persistence failure");
}
