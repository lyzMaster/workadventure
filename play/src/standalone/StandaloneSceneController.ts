import { writable, type Readable } from "svelte/store";
import { mapEditorModeStore } from "../front/Stores/MapEditorCoreStore";
import {
    mapEditorEntityModeStore,
    mapEditorSelectedEntityIdStore,
} from "../front/Stores/MapEditorStore";
import { ACTIVE_STANDALONE_SCENE_STORAGE_KEY, saveActiveStandaloneSceneId } from "./ActiveStandaloneScene";
import { IndexedDBSceneStorage } from "./IndexedDBSceneStorage";
import { LocalUserSessionProvider } from "./LocalUserSessionProvider";
import type { SceneStorage } from "./SceneStorage";
import { StandaloneApp } from "./StandaloneApp";
import { StandaloneSceneResolver } from "./StandaloneSceneResolver";
import { getStandaloneSceneDefinitions, resolveStandaloneSceneDefinition } from "./StandaloneSceneRegistry";
import type { StandaloneSceneDefinition, StandaloneSceneId } from "./StandaloneSceneDefinition";
import { StaticCharacterAssetCatalog } from "./StaticCharacterAssetCatalog";
import type { StandaloneGameScene } from "./runtime/StandaloneGameScene";
import {
    DefaultWorldCommandGateway,
    type WorldCommandGateway,
} from "./commands/WorldCommandGateway";
import type {
    ActiveSceneRuntimeProvider,
    SceneRuntimeSnapshot,
    WorldSceneRuntime,
    WorldSceneStateSnapshot,
} from "./commands/types";
import type { WorldCommand, WorldCommandResult } from "@workadventure/world-command";
import { IndexedDBAppWorldStorage } from "./storage/IndexedDBAppWorldStorage";
import { AppWorldRepository } from "./world/AppWorldRepository";
import { AppWorldCoordinator } from "./world/AppWorldCoordinator";

const STANDALONE_APP_WORLD_ID = "standalone-default-world";

export interface StandaloneSceneController {
    load(sceneId: StandaloneSceneId): Promise<void>;
    switchTo(sceneId: StandaloneSceneId): Promise<void>;
    reload(): Promise<void>;
    clearActiveOverlayAndReload(): Promise<void>;
    getActiveSceneId(): StandaloneSceneId | null;
}

export interface StandaloneSceneControllerState {
    activeSceneId: StandaloneSceneId | null;
    activeDefinition: StandaloneSceneDefinition | null;
    scene: StandaloneGameScene | null;
    loading: boolean;
    error: string | null;
}

export class DefaultStandaloneSceneController implements StandaloneSceneController, ActiveSceneRuntimeProvider {
    private activeSceneId: StandaloneSceneId | null = null;
    private transitionQueue: Promise<void> = Promise.resolve();
    private readonly worldCommandGateway: DefaultWorldCommandGateway;
    private readonly appWorldRepository: AppWorldRepository;
    private readonly appWorldCoordinator: AppWorldCoordinator;
    private state = writable<StandaloneSceneControllerState>({
        activeSceneId: null,
        activeDefinition: null,
        scene: null,
        loading: false,
        error: null,
    });

    public constructor(
        private readonly sceneResolver = new StandaloneSceneResolver(),
        private readonly sessionProvider = new LocalUserSessionProvider(),
        private readonly characterAssets = new StaticCharacterAssetCatalog(),
        private readonly app = new StandaloneApp(),
        private readonly storage: SceneStorage = new IndexedDBSceneStorage(),
        private readonly location: Location = window.location,
        private readonly localStorage: Storage = window.localStorage,
        private readonly appWorldStorage = new IndexedDBAppWorldStorage(),
    ) {
        this.appWorldRepository = new AppWorldRepository(this.appWorldStorage, STANDALONE_APP_WORLD_ID);
        this.appWorldCoordinator = new AppWorldCoordinator(
            this.appWorldRepository,
            getStandaloneSceneDefinitions().map((definition) => ({
                sceneId: definition.sceneId,
                baseMapId: definition.baseMapId,
                baseMapRevision: definition.baseMapRevision,
            })),
        );
        this.worldCommandGateway = new DefaultWorldCommandGateway(this);
        window.addEventListener("pagehide", this.handlePageHide);
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    public getState(): Readable<StandaloneSceneControllerState> {
        return this.state;
    }

    public getSceneDefinitions(): StandaloneSceneDefinition[] {
        return getStandaloneSceneDefinitions();
    }

    public getWorldCommandGateway(): WorldCommandGateway {
        return this.worldCommandGateway;
    }

    public async start(): Promise<void> {
        this.app.mountEditor(this);
        const bootstrap = await this.appWorldCoordinator.bootstrap({
            urlSceneId: new URL(this.location.href).searchParams.get("scene"),
            legacySceneId: this.localStorage.getItem(ACTIVE_STANDALONE_SCENE_STORAGE_KEY),
        });
        return this.load(resolveStandaloneSceneDefinition(bootstrap.initialSceneId).sceneId);
    }

    public load(sceneId: StandaloneSceneId): Promise<void> {
        return this.enqueueTransition(() => this.activate(sceneId));
    }

    public switchTo(sceneId: StandaloneSceneId): Promise<void> {
        return this.enqueueTransition(async () => {
            if (this.activeSceneId === sceneId) {
                return;
            }
            await this.activate(sceneId);
        });
    }

    public reload(): Promise<void> {
        return this.enqueueTransition(async () => {
            await this.activate(this.activeSceneId ?? resolveStandaloneSceneDefinition(null).sceneId);
        });
    }

    public async clearActiveOverlayAndReload(): Promise<void> {
        const sceneId = this.activeSceneId;
        if (!sceneId) {
            return;
        }
        await this.storage.clearOverlay(sceneId);
        await this.reload();
    }

    public getActiveSceneId(): StandaloneSceneId | null {
        return this.activeSceneId;
    }

    public getActiveRuntime(): WorldSceneRuntime | null {
        return this.getSnapshot().scene?.getWorldSceneRuntime() ?? null;
    }

    public switchScene(sceneId: StandaloneSceneId): Promise<void> {
        return this.switchTo(sceneId);
    }

    public subscribe(listener: (snapshot: SceneRuntimeSnapshot) => void): () => void {
        return this.state.subscribe((state) => {
            listener({
                activeSceneId: state.activeSceneId,
                hasRuntime: Boolean(state.scene),
                loading: state.loading,
            });
        });
    }

    public getSceneStateSnapshot(): WorldSceneStateSnapshot {
        const snapshot = this.getSnapshot();
        const runtime = snapshot.scene?.getWorldSceneRuntime();
        const agents = runtime?.agentCommands.list();
        const furniture = runtime?.furnitureCommands.list() ?? [];
        const history = runtime?.furnitureCommands.getHistoryState() ?? { canUndo: false, canRedo: false };
        const persistence = this.appWorldCoordinator.getPersistenceSnapshot();
        return {
            activeSceneId: snapshot.activeSceneId,
            loading: snapshot.loading,
            availableScenes: this.getSceneDefinitions().map((definition) => ({
                sceneId: definition.sceneId,
                displayName: definition.displayName,
            })),
            player: snapshot.scene?.CurrentPlayer?.getSnapshot() ?? null,
            agents: agents?.ok ? agents.value : [],
            furniture: {
                count: furniture.length,
                entities: furniture,
                canUndo: history.canUndo,
                canRedo: history.canRedo,
            },
            persistence: {
                loaded: persistence.loaded,
                restoring: persistence.restoring,
                dirty: persistence.dirty,
                revision: persistence.revision,
                lastSavedAt: persistence.lastSavedAt,
                lastError: persistence.lastError,
                restoreDiagnosticCount: persistence.restoreDiagnosticCount,
            },
        };
    }

    public isTransitionInProgress(): boolean {
        return this.getSnapshot().loading;
    }

    public async afterCommand(command: WorldCommand, result: WorldCommandResult): Promise<WorldCommandResult | void> {
        if (command.type === "world.flush") {
            const scene = this.getSnapshot().scene;
            if (!scene) {
                return result;
            }
            const runtimeData = (result.data ?? {}) as { sceneOverlaySaved?: boolean; sceneOverlayError?: string };
            if (runtimeData.sceneOverlaySaved === false) {
                return this.makePersistenceFailureResult(
                    command,
                    result,
                    {
                        runtimeApplied: true,
                        dirty: this.appWorldRepository.getPersistenceState().dirty,
                        sceneOverlaySaved: false,
                        appWorldSaved: false,
                    },
                    runtimeData.sceneOverlayError ?? "SceneOverlay flush failed",
                );
            }
            await this.appWorldCoordinator.captureRuntime(scene);
            await this.appWorldRepository.flush();
            const persistence = this.appWorldRepository.getPersistenceState();
            if (persistence.lastError) {
                return this.makePersistenceFailureResult(command, result, {
                    runtimeApplied: true,
                    dirty: persistence.dirty,
                    sceneOverlaySaved: true,
                    appWorldSaved: false,
                }, persistence.lastError.message);
            }
            return {
                ...result,
                data: {
                    flushed: true,
                    appWorldSaved: true,
                    sceneOverlaySaved: true,
                    revision: persistence.revision,
                    savedAt: persistence.lastSavedAt,
                },
            };
        }

        const persistenceFailure = await this.appWorldCoordinator.handleCommandPersistence(command, result);
        if (!persistenceFailure) {
            return undefined;
        }
        return this.makePersistenceFailureResult(command, result, persistenceFailure.details, persistenceFailure.message);
    }

    private enqueueTransition(operation: () => Promise<void>): Promise<void> {
        if (this.getSnapshot().loading) {
            console.warn("[Standalone] transition_in_progress: queueing scene transition");
        }
        const next = this.transitionQueue.then(operation, operation);
        this.transitionQueue = next.catch(() => undefined);
        return next;
    }

    private async activate(sceneId: StandaloneSceneId): Promise<void> {
        const definition = resolveStandaloneSceneDefinition(sceneId);
        const previous = this.getSnapshot();
        this.setState({ ...previous, loading: true, error: null });

        try {
            const { context, definition: resolvedDefinition } = this.sceneResolver.resolve(definition.sceneId);
            await this.preflightBaseMap(resolvedDefinition);
            await this.flushCurrentScene();
            this.clearEditorRuntimeState();

            this.appWorldCoordinator.unbindRuntime(previous.scene);
            await this.app.destroyGame();

            const session = this.sessionProvider.getSession();
            const scene = this.app.startScene(
                context,
                resolvedDefinition,
                this.storage,
                session.name,
                this.characterAssets.resolve(session.characterTextureIds),
                {
                    onPlayerMovementSettled: (player) => this.appWorldCoordinator.onPlayerMovementSettled(player),
                },
            );
            await scene.sceneReadyToStartPromise;
            this.setState({
                activeSceneId: previous.activeSceneId,
                activeDefinition: resolvedDefinition,
                scene,
                loading: true,
                error: null,
            });
            await this.appWorldCoordinator.bindRuntime(scene);
            this.activeSceneId = resolvedDefinition.sceneId;
            saveActiveStandaloneSceneId(resolvedDefinition.sceneId, this.localStorage);
            this.replaceSceneQuery(resolvedDefinition.sceneId);
            await this.appWorldCoordinator.persistActiveSceneSelection(resolvedDefinition.sceneId);
            this.setState({
                activeSceneId: resolvedDefinition.sceneId,
                activeDefinition: resolvedDefinition,
                scene,
                loading: false,
                error: null,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[Standalone] scene_load_failed: ${message}`, error);
            this.setState({ ...previous, loading: false, error: message });
        }
    }

    private async flushCurrentScene(): Promise<void> {
        const scene = this.getSnapshot().scene;
        try {
            await scene?.getMapEditorModeManager()?.flush?.();
            if (scene) {
                const result = await this.appWorldCoordinator.flush(scene);
                if (result.error) {
                    throw new Error(result.error.message);
                }
            }
        } catch (error) {
            console.error("[Standalone] persistence_flush_failed", error);
            throw error;
        }
    }

    private clearEditorRuntimeState(): void {
        mapEditorModeStore.switchMode(false);
        mapEditorSelectedEntityIdStore.set(undefined);
        mapEditorEntityModeStore.set("ADD");
    }

    private async preflightBaseMap(definition: StandaloneSceneDefinition): Promise<void> {
        const wamUrl = this.resolveStandaloneAssetUrl(definition.wamUrl, "/maps/");
        const wamResponse = await fetch(wamUrl.toString());
        if (!wamResponse.ok) {
            throw new Error(`Unable to load ${definition.sceneId} WAM: ${wamResponse.status}`);
        }
        const wam = (await wamResponse.json()) as { mapUrl?: unknown };
        if (typeof wam.mapUrl !== "string") {
            throw new Error(`Unable to resolve ${definition.sceneId} TMJ from WAM`);
        }
        const tmjUrl = this.resolveStandaloneAssetUrl(wam.mapUrl, "/maps/", wamUrl);
        const tmjResponse = await fetch(tmjUrl.toString());
        if (!tmjResponse.ok) {
            throw new Error(`Unable to load ${definition.sceneId} TMJ: ${tmjResponse.status}`);
        }
    }

    private resolveStandaloneAssetUrl(path: string, requiredPathPrefix: string, base?: URL): URL {
        const url = new URL(path, base ?? this.location.href);
        if (url.origin !== new URL(this.location.href).origin || !url.pathname.startsWith(requiredPathPrefix)) {
            throw new Error(`Refusing to load standalone asset outside ${requiredPathPrefix}: ${url.toString()}`);
        }
        return url;
    }

    private replaceSceneQuery(sceneId: StandaloneSceneId): void {
        const url = new URL(window.location.href);
        url.searchParams.set("scene", sceneId);
        window.history.replaceState({}, "WorkAdventure Standalone", url);
    }

    private readonly handlePageHide = (): void => {
        void this.flushWithoutBlocking();
    };

    private readonly handleVisibilityChange = (): void => {
        if (!document.hidden) {
            return;
        }
        void this.flushWithoutBlocking();
    };

    private getSnapshot(): StandaloneSceneControllerState {
        let snapshot!: StandaloneSceneControllerState;
        const unsubscribe = this.state.subscribe((value) => {
            snapshot = value;
        });
        unsubscribe();
        return snapshot;
    }

    private setState(state: StandaloneSceneControllerState): void {
        this.state.set(state);
    }

    private async flushWithoutBlocking(): Promise<void> {
        if (this.getSnapshot().loading) {
            return;
        }
        try {
            await this.flushCurrentScene();
        } catch (error) {
            console.error("[Standalone] background_flush_failed", error);
        }
    }

    private makePersistenceFailureResult(
        command: WorldCommand,
        base: WorldCommandResult,
        details: Record<string, unknown>,
        message: string,
    ): WorldCommandResult {
        return {
            ...base,
            type: command.type,
            status: "failed",
            data: undefined,
            error: {
                code: "persistence_failed",
                message,
                details,
            },
        };
    }
}
