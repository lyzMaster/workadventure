import { SceneOverlay } from "../SceneOverlay";
import type { SceneOverlaySummary, SceneStorage } from "../SceneStorage";
import {
    SCENE_OVERLAY_STORE,
    runStandaloneStoreRequest,
} from "./StandaloneDatabase";

export class IndexedDBSceneStorage implements SceneStorage {
    public constructor(private readonly indexedDBFactory: IDBFactory = indexedDB) {}

    public async loadOverlay(sceneId: string): Promise<SceneOverlay | null> {
        const value = await runStandaloneStoreRequest<unknown>(
            SCENE_OVERLAY_STORE,
            "readonly",
            (store) => store.get(sceneId),
            this.indexedDBFactory,
        );
        if (value === undefined) {
            return null;
        }
        return SceneOverlay.parse(value);
    }

    public async saveOverlay(sceneId: string, overlay: SceneOverlay): Promise<void> {
        if (sceneId !== overlay.sceneId) {
            throw new Error(`Storage key "${sceneId}" does not match overlay sceneId "${overlay.sceneId}"`);
        }
        const validOverlay = SceneOverlay.parse(structuredClone(overlay));
        await runStandaloneStoreRequest(
            SCENE_OVERLAY_STORE,
            "readwrite",
            (store) => store.put(validOverlay),
            this.indexedDBFactory,
        );
    }

    public async clearOverlay(sceneId: string): Promise<void> {
        await runStandaloneStoreRequest(
            SCENE_OVERLAY_STORE,
            "readwrite",
            (store) => store.delete(sceneId),
            this.indexedDBFactory,
        );
    }

    public async listOverlays(): Promise<SceneOverlaySummary[]> {
        const values = await runStandaloneStoreRequest<unknown[]>(
            SCENE_OVERLAY_STORE,
            "readonly",
            (store) => store.getAll(),
            this.indexedDBFactory,
        );
        return values.map((value) => {
            const overlay = SceneOverlay.parse(value);
            return {
                sceneId: overlay.sceneId,
                baseMapId: overlay.baseMapId,
                baseMapRevision: overlay.baseMapRevision,
                updatedAt: overlay.updatedAt,
            };
        });
    }
}
