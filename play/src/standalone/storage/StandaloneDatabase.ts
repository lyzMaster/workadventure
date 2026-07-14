export const STANDALONE_DATABASE_NAME = "workadventure-standalone";
export const STANDALONE_DATABASE_VERSION = 2;
export const SCENE_OVERLAY_STORE = "scene-overlays";
export const APP_WORLD_STORE = "app-worlds";

export async function openStandaloneDatabase(indexedDBFactory: IDBFactory = indexedDB): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDBFactory.open(STANDALONE_DATABASE_NAME, STANDALONE_DATABASE_VERSION);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(SCENE_OVERLAY_STORE)) {
                database.createObjectStore(SCENE_OVERLAY_STORE, { keyPath: "sceneId" });
            }
            if (!database.objectStoreNames.contains(APP_WORLD_STORE)) {
                database.createObjectStore(APP_WORLD_STORE, { keyPath: "worldId" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
        request.onblocked = () => reject(new Error("IndexedDB upgrade was blocked"));
    });
}

export async function runStandaloneStoreRequest<T = undefined>(
    storeName: string,
    mode: IDBTransactionMode,
    createRequest: (store: IDBObjectStore) => IDBRequest<T>,
    indexedDBFactory: IDBFactory = indexedDB,
): Promise<T> {
    const database = await openStandaloneDatabase(indexedDBFactory);
    try {
        return await new Promise<T>((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = createRequest(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
            transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
        });
    } finally {
        database.close();
    }
}
