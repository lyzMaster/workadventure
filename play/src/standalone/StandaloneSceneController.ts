import { writable, type Readable } from "svelte/store";
import {
    mapEditorEntityModeStore,
    mapEditorModeStore,
    mapEditorSelectedAreaPreviewStore,
    mapEditorSelectedEntityStore,
} from "../front/Stores/MapEditorStore";
import { resolveInitialStandaloneSceneId, saveActiveStandaloneSceneId } from "./ActiveStandaloneScene";
import { IndexedDBSceneStorage } from "./IndexedDBSceneStorage";
import { LocalUserSessionProvider } from "./LocalUserSessionProvider";
import type { SceneStorage } from "./SceneStorage";
import { StandaloneApp } from "./StandaloneApp";
import { StandaloneSceneResolver } from "./StandaloneSceneResolver";
import { getStandaloneSceneDefinitions, resolveStandaloneSceneDefinition } from "./StandaloneSceneRegistry";
import type { StandaloneSceneDefinition, StandaloneSceneId } from "./StandaloneSceneDefinition";
import { StaticCharacterAssetCatalog } from "./StaticCharacterAssetCatalog";
import type { StandaloneGameScene } from "./runtime/StandaloneGameScene";

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

export class DefaultStandaloneSceneController implements StandaloneSceneController {
    private activeSceneId: StandaloneSceneId | null = null;
    private transitionQueue: Promise<void> = Promise.resolve();
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
    ) {}

    public getState(): Readable<StandaloneSceneControllerState> {
        return this.state;
    }

    public getSceneDefinitions(): StandaloneSceneDefinition[] {
        return getStandaloneSceneDefinitions();
    }

    public start(): Promise<void> {
        this.app.mountEditor(this);

        return this.load(resolveInitialStandaloneSceneId(this.location, this.localStorage));
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
            await this.activate(
                this.activeSceneId ?? resolveInitialStandaloneSceneId(this.location, this.localStorage),
            );
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

            await this.app.destroyGame();

            const session = this.sessionProvider.getSession();
            const scene = this.app.startScene(
                context,
                resolvedDefinition,
                this.storage,
                session.name,
                this.characterAssets.resolve(session.characterTextureIds),
            );
            await scene.sceneReadyToStartPromise;
            this.activeSceneId = resolvedDefinition.sceneId;
            saveActiveStandaloneSceneId(resolvedDefinition.sceneId, this.localStorage);
            this.replaceSceneQuery(resolvedDefinition.sceneId);
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
            await scene?.flushPersistence();
        } catch (error) {
            console.error("[Standalone] persistence_flush_failed", error);
            throw error;
        }
    }

    private clearEditorRuntimeState(): void {
        mapEditorModeStore.switchMode(false);
        mapEditorSelectedEntityStore.set(undefined);
        mapEditorSelectedAreaPreviewStore.set(undefined);
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
}
