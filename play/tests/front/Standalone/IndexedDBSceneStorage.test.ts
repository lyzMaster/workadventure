import { IDBFactory } from "fake-indexeddb";
import type { WAMFileFormat } from "@workadventure/map-editor";
import { beforeEach, describe, expect, it } from "vitest";
import { IndexedDBSceneStorage } from "../../../src/standalone/IndexedDBSceneStorage";
import { createSceneOverlay } from "../../../src/standalone/SceneOverlay";
import { standaloneSceneRegistry } from "../../../src/standalone/StandaloneSceneRegistry";

const wam: WAMFileFormat = {
    version: "2.1.0",
    mapUrl: "./map.tmj",
    entities: {},
    areas: [],
    entityCollections: [],
};

describe("IndexedDBSceneStorage", () => {
    let storage: IndexedDBSceneStorage;

    beforeEach(() => {
        storage = new IndexedDBSceneStorage(new IDBFactory());
    });

    it("returns null when no overlay has been saved", async () => {
        await expect(storage.loadOverlay("home")).resolves.toBeNull();
    });

    it("saves and loads a valid SceneOverlay", async () => {
        const overlay = createSceneOverlay(standaloneSceneRegistry.home, [], wam, "2026-07-13T12:00:00.000Z");

        await storage.saveOverlay("home", overlay);

        await expect(storage.loadOverlay("home")).resolves.toEqual(overlay);
    });

    it("clears an overlay so the caller can restore the base WAM", async () => {
        await storage.saveOverlay("home", createSceneOverlay(standaloneSceneRegistry.home, [], wam));

        await storage.clearOverlay("home");

        await expect(storage.loadOverlay("home")).resolves.toBeNull();
    });

    it("keeps home and office overlays under separate keys", async () => {
        const home = createSceneOverlay(standaloneSceneRegistry.home, [], wam, "2026-07-13T12:00:00.000Z");
        const office = createSceneOverlay(standaloneSceneRegistry.office, [], wam, "2026-07-13T12:01:00.000Z");

        await storage.saveOverlay("home", home);
        await storage.saveOverlay("office", office);

        await storage.clearOverlay("home");

        await expect(storage.loadOverlay("home")).resolves.toBeNull();
        await expect(storage.loadOverlay("office")).resolves.toEqual(office);
        await expect(storage.listOverlays()).resolves.toEqual([
            {
                sceneId: "office",
                baseMapId: "standalone-office",
                baseMapRevision: 2,
                updatedAt: "2026-07-13T12:01:00.000Z",
            },
        ]);
    });

    it("rejects a key that does not match overlay.sceneId", async () => {
        const overlay = createSceneOverlay(standaloneSceneRegistry.home, [], wam);

        await expect(storage.saveOverlay("office", overlay)).rejects.toThrow(/does not match overlay sceneId/);
    });
});
