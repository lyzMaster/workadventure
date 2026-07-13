import { SceneOverlay } from "./SceneOverlay";
import type { SceneOverlaySummary, SceneStorage } from "./SceneStorage";

export const STANDALONE_DATABASE_NAME = "workadventure-standalone";
export const STANDALONE_DATABASE_VERSION = 1;
export const SCENE_OVERLAY_STORE = "scene-overlays";

export class IndexedDBSceneStorage implements SceneStorage {
    public constructor(private readonly indexedDBFactory: IDBFactory = indexedDB) {}

    public async loadOverlay(sceneId: string): Promise<SceneOverlay | null> {
        const value = await this.runRequest<unknown>("readonly", (store) => store.get(sceneId));
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
        await this.runRequest("readwrite", (store) => store.put(validOverlay));
    }

    public async clearOverlay(sceneId: string): Promise<void> {
        await this.runRequest("readwrite", (store) => store.delete(sceneId));
    }

    public async listOverlays(): Promise<SceneOverlaySummary[]> {
        const values = await this.runRequest<unknown[]>("readonly", (store) => store.getAll());
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

    private async openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = this.indexedDBFactory.open(STANDALONE_DATABASE_NAME, STANDALONE_DATABASE_VERSION);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(SCENE_OVERLAY_STORE)) {
                    database.createObjectStore(SCENE_OVERLAY_STORE, { keyPath: "sceneId" });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
        });
    }

    private async runRequest<T = undefined>(
        mode: IDBTransactionMode,
        createRequest: (store: IDBObjectStore) => IDBRequest<T>,
    ): Promise<T> {
        const database = await this.openDatabase();
        try {
            return await new Promise<T>((resolve, reject) => {
                const transaction = database.transaction(SCENE_OVERLAY_STORE, mode);
                const request = createRequest(transaction.objectStore(SCENE_OVERLAY_STORE));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
                transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
            });
        } finally {
            database.close();
        }
    }
}
