import { AppWorldSnapshotSchema, type AppWorldSnapshot } from "@workadventure/app-world";
import type { AppWorldStorage, AppWorldSummary } from "../world/AppWorldStorage";
import {
    APP_WORLD_STORE,
    runStandaloneStoreRequest,
} from "./StandaloneDatabase";

export class IndexedDBAppWorldStorage implements AppWorldStorage {
    public constructor(private readonly indexedDBFactory: IDBFactory = indexedDB) {}

    public async load(worldId: string): Promise<AppWorldSnapshot | null> {
        const value = await runStandaloneStoreRequest<unknown>(
            APP_WORLD_STORE,
            "readonly",
            (store) => store.get(worldId),
            this.indexedDBFactory,
        );
        if (value === undefined) {
            return null;
        }
        return AppWorldSnapshotSchema.parse(value);
    }

    public async save(worldId: string, snapshot: AppWorldSnapshot): Promise<void> {
        if (worldId !== snapshot.worldId) {
            throw new Error(`Storage key "${worldId}" does not match snapshot worldId "${snapshot.worldId}"`);
        }
        const validSnapshot = AppWorldSnapshotSchema.parse(structuredClone(snapshot));
        await runStandaloneStoreRequest(
            APP_WORLD_STORE,
            "readwrite",
            (store) => store.put(validSnapshot),
            this.indexedDBFactory,
        );
    }

    public async clear(worldId: string): Promise<void> {
        await runStandaloneStoreRequest(
            APP_WORLD_STORE,
            "readwrite",
            (store) => store.delete(worldId),
            this.indexedDBFactory,
        );
    }

    public async list(): Promise<AppWorldSummary[]> {
        const values = await runStandaloneStoreRequest<unknown[]>(
            APP_WORLD_STORE,
            "readonly",
            (store) => store.getAll(),
            this.indexedDBFactory,
        );
        return values.map((value) => {
            const snapshot = AppWorldSnapshotSchema.parse(value);
            return {
                worldId: snapshot.worldId,
                revision: snapshot.revision,
                activeSceneId: snapshot.activeSceneId,
                updatedAt: snapshot.updatedAt,
            };
        });
    }
}
