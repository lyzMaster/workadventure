import {
    AppWorldSnapshotSchema,
    migrateAppWorldSnapshot,
    type AppWorldSnapshot,
    type MigrationDiagnostic,
    type PersistedAgentState,
    type PersistedPlayerState,
    type PersistedSceneState,
} from "@workadventure/app-world";
import type { AppWorldStorage } from "./AppWorldStorage";

export interface AppWorldSceneRef {
    sceneId: string;
    baseMapId: string;
    baseMapRevision: number;
}

export interface AppWorldPersistenceError {
    code: string;
    message: string;
}

export interface AppWorldPersistenceState {
    loaded: boolean;
    dirty: boolean;
    revision: number;
    lastSavedAt?: string;
    lastError?: AppWorldPersistenceError;
    diagnostics: MigrationDiagnostic[];
}

export interface AppWorldRepositoryOptions {
    debounceMs?: number;
    now?: () => Date;
}

const DEFAULT_DEBOUNCE_MS = 150;

export class AppWorldRepository {
    private snapshot: AppWorldSnapshot | null = null;
    private loaded = false;
    private dirty = false;
    private lastSavedAt: string | undefined;
    private lastError: AppWorldPersistenceError | undefined;
    private diagnostics: MigrationDiagnostic[] = [];
    private debounceHandle: ReturnType<typeof setTimeout> | undefined;
    private saveChain: Promise<void> = Promise.resolve();
    private mutationId = 0;

    public constructor(
        private readonly storage: AppWorldStorage,
        private readonly worldId: string,
        private readonly options: AppWorldRepositoryOptions = {},
    ) {}

    public getWorldId(): string {
        return this.worldId;
    }

    public async load(): Promise<{ snapshot: AppWorldSnapshot | null; diagnostics: MigrationDiagnostic[] }> {
        try {
            const raw = await this.storage.load(this.worldId);
            const migrated = migrateAppWorldSnapshot(raw);
            this.diagnostics = [...migrated.diagnostics];
            return {
                snapshot: migrated.snapshot,
                diagnostics: [...migrated.diagnostics],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const diagnostics: MigrationDiagnostic[] = [{ code: "invalid_snapshot", message }];
            this.diagnostics = diagnostics;
            this.lastError = { code: "invalid_snapshot", message };
            return {
                snapshot: null,
                diagnostics,
            };
        }
    }

    public initialize(snapshot: AppWorldSnapshot, options: { markDirty?: boolean; diagnostics?: MigrationDiagnostic[] } = {}): void {
        this.snapshot = AppWorldSnapshotSchema.parse(structuredClone(snapshot));
        this.loaded = true;
        this.dirty = options.markDirty ?? false;
        this.lastSavedAt = this.dirty ? undefined : this.snapshot.updatedAt;
        this.lastError = undefined;
        this.diagnostics = [...(options.diagnostics ?? this.diagnostics)];
        this.clearDebounce();
    }

    public validate(snapshot: unknown): AppWorldSnapshot {
        return AppWorldSnapshotSchema.parse(snapshot);
    }

    public migrate(snapshot: unknown) {
        return migrateAppWorldSnapshot(snapshot);
    }

    public getSnapshot(): AppWorldSnapshot | null {
        return this.snapshot ? toJson(this.snapshot) : null;
    }

    public getPersistenceState(): AppWorldPersistenceState {
        return {
            loaded: this.loaded,
            dirty: this.dirty,
            revision: this.snapshot?.revision ?? 0,
            lastSavedAt: this.lastSavedAt,
            lastError: this.lastError ? { ...this.lastError } : undefined,
            diagnostics: [...this.diagnostics],
        };
    }

    public setActiveScene(sceneId: string): void {
        this.mutate((snapshot) => {
            snapshot.activeSceneId = sceneId;
        });
    }

    public updatePlayer(sceneRef: AppWorldSceneRef, player: PersistedPlayerState | null): void {
        this.mutate((snapshot) => {
            const scene = ensureScene(snapshot, sceneRef);
            if (player) {
                scene.player = structuredClone(player);
            } else {
                delete scene.player;
            }
        });
    }

    public upsertAgent(sceneRef: AppWorldSceneRef, agent: PersistedAgentState): void {
        this.mutate((snapshot) => {
            const scene = ensureScene(snapshot, sceneRef);
            scene.agents[agent.characterId] = structuredClone(agent);
        });
    }

    public removeAgent(sceneRef: AppWorldSceneRef, characterId: string): void {
        this.mutate((snapshot) => {
            const scene = ensureScene(snapshot, sceneRef);
            delete scene.agents[characterId];
        });
    }

    public replaceScene(scene: PersistedSceneState): void {
        this.mutate((snapshot) => {
            snapshot.scenes[scene.sceneId] = structuredClone(scene);
        });
    }

    public scheduleSave(): void {
        if (!this.loaded || !this.snapshot || !this.dirty) {
            return;
        }
        this.clearDebounce();
        this.debounceHandle = setTimeout(() => {
            this.debounceHandle = undefined;
            void this.queueSave();
        }, this.options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    }

    public async flush(): Promise<void> {
        this.clearDebounce();
        await this.queueSave();
        await this.saveChain;
    }

    public retry(): Promise<void> {
        return this.flush();
    }

    private mutate(mutator: (snapshot: AppWorldSnapshot) => void): void {
        const snapshot = this.requireSnapshot();
        const next = toJson(snapshot);
        mutator(next);
        this.snapshot = AppWorldSnapshotSchema.parse(next);
        this.dirty = true;
        this.lastError = undefined;
        this.mutationId += 1;
        this.scheduleSave();
    }

    private async queueSave(): Promise<void> {
        if (!this.loaded || !this.snapshot || !this.dirty) {
            return;
        }
        const pendingMutationId = this.mutationId;
        const baseSnapshot = this.snapshot;
        const savedAt = this.timestamp();
        const snapshotToSave = AppWorldSnapshotSchema.parse({
            ...toJson(baseSnapshot),
            revision: baseSnapshot.revision + 1,
            updatedAt: savedAt,
        });

        this.saveChain = this.saveChain.then(async () => {
            try {
                await this.storage.save(this.worldId, snapshotToSave);
                if (!this.snapshot) {
                    return;
                }
                this.lastSavedAt = savedAt;
                this.lastError = undefined;
                if (pendingMutationId === this.mutationId) {
                    this.snapshot = snapshotToSave;
                    this.dirty = false;
                    return;
                }
                this.snapshot = AppWorldSnapshotSchema.parse({
                    ...toJson(this.snapshot),
                    revision: snapshotToSave.revision,
                    updatedAt: snapshotToSave.updatedAt,
                });
                this.dirty = true;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.lastError = { code: "persistence_failed", message };
                this.dirty = true;
            }
        });

        return this.saveChain;
    }

    private requireSnapshot(): AppWorldSnapshot {
        if (!this.snapshot) {
            throw new Error("AppWorldRepository is not initialized");
        }
        return this.snapshot;
    }

    private clearDebounce(): void {
        if (this.debounceHandle !== undefined) {
            clearTimeout(this.debounceHandle);
            this.debounceHandle = undefined;
        }
    }

    private timestamp(): string {
        return (this.options.now ?? (() => new Date()))().toISOString();
    }
}

function ensureScene(snapshot: AppWorldSnapshot, sceneRef: AppWorldSceneRef): PersistedSceneState {
    const existing = snapshot.scenes[sceneRef.sceneId];
    if (existing) {
        existing.baseMapId = sceneRef.baseMapId;
        existing.baseMapRevision = sceneRef.baseMapRevision;
        return existing;
    }
    const created: PersistedSceneState = {
        sceneId: sceneRef.sceneId,
        baseMapId: sceneRef.baseMapId,
        baseMapRevision: sceneRef.baseMapRevision,
        agents: {},
    };
    snapshot.scenes[sceneRef.sceneId] = created;
    return created;
}

function toJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}
