import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDBAppWorldStorage } from "../../../src/standalone/storage/IndexedDBAppWorldStorage";
import { IndexedDBSceneStorage } from "../../../src/standalone/storage/IndexedDBSceneStorage";
import {
    APP_WORLD_STORE,
    SCENE_OVERLAY_STORE,
    STANDALONE_DATABASE_NAME,
    openStandaloneDatabase,
} from "../../../src/standalone/storage/StandaloneDatabase";
import { createSceneOverlay } from "../../../src/standalone/SceneOverlay";
import { standaloneSceneRegistry } from "../../../src/standalone/StandaloneSceneRegistry";

describe("IndexedDBAppWorldStorage", () => {
    let factory: IDBFactory;
    let storage: IndexedDBAppWorldStorage;

    beforeEach(() => {
        factory = new IDBFactory();
        storage = new IndexedDBAppWorldStorage(factory);
    });

    it("upgrades v1 databases to v2 without losing scene-overlays and creates app-worlds", async () => {
        await new Promise<void>((resolve, reject) => {
            const request = factory.open(STANDALONE_DATABASE_NAME, 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore(SCENE_OVERLAY_STORE, { keyPath: "sceneId" });
            };
            request.onsuccess = () => {
                request.result.close();
                resolve();
            };
            request.onerror = () => reject(request.error);
        });

        const sceneStorage = new IndexedDBSceneStorage(factory);
        const overlay = createSceneOverlay(
            standaloneSceneRegistry.home,
            [],
            { version: "2.1.0", mapUrl: "./map.tmj", entities: {}, areas: [], entityCollections: [] },
            "2026-07-14T00:00:00.000Z",
        );
        await sceneStorage.saveOverlay("home", overlay);

        const database = await openStandaloneDatabase(factory);
        expect(database.objectStoreNames.contains(SCENE_OVERLAY_STORE)).toBe(true);
        expect(database.objectStoreNames.contains(APP_WORLD_STORE)).toBe(true);
        database.close();

        await expect(sceneStorage.loadOverlay("home")).resolves.toEqual(overlay);
    });

    it("saves, loads and clears app worlds", async () => {
        const snapshot = {
            schemaVersion: 1 as const,
            worldId: "standalone-default-world",
            revision: 1,
            activeSceneId: "home",
            scenes: {},
            updatedAt: "2026-07-14T00:00:00.000Z",
        };

        await storage.save(snapshot.worldId, snapshot);
        await expect(storage.load(snapshot.worldId)).resolves.toEqual(snapshot);

        await storage.clear(snapshot.worldId);
        await expect(storage.load(snapshot.worldId)).resolves.toBeNull();
    });
});
