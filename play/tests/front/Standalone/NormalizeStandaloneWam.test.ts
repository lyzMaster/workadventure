import { readFileSync } from "node:fs";
import { IDBFactory } from "fake-indexeddb";
import {
    normalizeStandaloneWam,
    standaloneWamToStorageDto,
    type WAMEntityData,
    type WAMFileFormat,
} from "@workadventure/map-editor";
import { describe, expect, it } from "vitest";
import { IndexedDBSceneStorage } from "../../../src/standalone/IndexedDBSceneStorage";
import { createSceneOverlay, mergeSceneOverlay } from "../../../src/standalone/SceneOverlay";
import { standaloneSceneRegistry } from "../../../src/standalone/StandaloneSceneRegistry";

function readWam(relativePath: string): WAMFileFormat {
    return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as WAMFileFormat;
}

function createLegacyWam(overrides: Partial<Record<keyof WAMFileFormat | "settings", unknown>> = {}): Record<string, unknown> {
    return {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities: {},
        areas: [],
        entityCollections: [{ url: "./assets/entities/entities.json", type: "file" }],
        ...overrides,
    };
}

describe("normalizeStandaloneWam", () => {
    it("keeps Home WAM equivalent after normalization", () => {
        const home = readWam("../../../public/maps/home/home.wam");
        const result = normalizeStandaloneWam(home);

        expect(result.diagnostics).toEqual([]);
        expect(standaloneWamToStorageDto(result.wam)).toEqual(home);
    });

    it("keeps Office WAM equivalent after normalization", () => {
        const office = readWam("../../../public/maps/office/office.wam");
        const result = normalizeStandaloneWam(office);

        expect(result.diagnostics).toEqual([]);
        expect(standaloneWamToStorageDto(result.wam)).toEqual(office);
    });

    it("preserves furniture entities and entity collections", () => {
        const chair: WAMEntityData = {
            x: 32,
            y: 64,
            prefabRef: { collectionName: "basic furniture", id: "chair-down-grey" },
            properties: [],
        };

        const result = normalizeStandaloneWam(
            createLegacyWam({
                entities: { chair },
            }),
        );

        expect(result.wam.entities.chair).toMatchObject({
            x: chair.x,
            y: chair.y,
            prefabRef: chair.prefabRef,
        });
        expect(result.wam.entities.chair?.properties).toBeUndefined();
        expect(result.wam.entityCollections).toEqual([{ url: "./assets/entities/entities.json", type: "file" }]);
    });

    it("preserves supported playAudio capabilities", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "music",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "music",
                        properties: [{ id: "audio", type: "playAudio", audioLink: "./sound.mp3", volume: 0.5 }],
                    },
                ],
                entities: {
                    radio: {
                        x: 10,
                        y: 20,
                        prefabRef: { collectionName: "basic furniture", id: "radio" },
                        properties: [{ id: "entity-audio", type: "playAudio", audioLink: "./sound.mp3" }],
                    },
                },
            }),
        );

        expect(result.diagnostics).toEqual([]);
        expect(result.wam.areas[0]?.properties[0]).toMatchObject({ type: "playAudio", audioLink: "./sound.mp3" });
        expect(result.wam.entities.radio?.properties?.[0]).toMatchObject({
            type: "playAudio",
            audioLink: "./sound.mp3",
        });
    });

    it("removes Jitsi properties and reports a diagnostic", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "meeting",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "meeting",
                        properties: [{ id: "jitsi", type: "jitsiRoomProperty", roomName: "room-a" }],
                    },
                ],
            }),
        );

        expect(result.wam.areas[0]?.properties).toEqual([]);
        expect(result.diagnostics).toContainEqual({
            path: "areas[0].properties[0]",
            feature: "jitsiRoomProperty",
            reason: "unsupported_property",
        });
    });

    it("removes LiveKit properties and reports a diagnostic", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "livekit",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "livekit",
                        properties: [{ id: "livekit", type: "livekitRoomProperty", roomName: "lk-room" }],
                    },
                ],
            }),
        );

        expect(result.wam.areas[0]?.properties).toEqual([]);
        expect(result.diagnostics).toContainEqual({
            path: "areas[0].properties[0]",
            feature: "livekitRoomProperty",
            reason: "unsupported_property",
        });
    });

    it("removes Matrix properties and reports a diagnostic", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "matrix",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "matrix",
                        properties: [{ id: "matrix", type: "matrixRoomPropertyData", displayName: "Matrix" }],
                    },
                ],
            }),
        );

        expect(result.wam.areas[0]?.properties).toEqual([]);
        expect(result.diagnostics).toContainEqual({
            path: "areas[0].properties[0]",
            feature: "matrixRoomPropertyData",
            reason: "unsupported_property",
        });
    });

    it("removes megaphone and recording settings while keeping the map loadable", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                settings: {
                    megaphone: { enabled: true, rights: ["admin"] },
                    recording: { rights: ["admin"] },
                },
            }),
        );

        expect("settings" in result.wam).toBe(false);
        expect(result.diagnostics).toContainEqual({
            path: "settings.megaphone",
            feature: "megaphone",
            reason: "unsupported_setting",
        });
        expect(result.diagnostics).toContainEqual({
            path: "settings.recording",
            feature: "recording",
            reason: "unsupported_setting",
        });
    });

    it("keeps valid properties when mixed with unsupported ones", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "mixed",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "mixed",
                        properties: [
                            { id: "start", type: "start", isDefault: true },
                            { id: "jitsi", type: "jitsiRoomProperty", roomName: "room-a" },
                            { id: "audio", type: "playAudio", audioLink: "./sound.mp3" },
                        ],
                    },
                ],
            }),
        );

        expect(result.wam.areas[0]?.properties.map((property) => property.type)).toEqual(["start", "playAudio"]);
        expect(result.diagnostics).toContainEqual({
            path: "areas[0].properties[1]",
            feature: "jitsiRoomProperty",
            reason: "unsupported_property",
        });
    });

    it("does not fail the whole WAM on unknown properties", () => {
        const result = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "unknown",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "unknown",
                        properties: [{ id: "mystery", type: "unknownStandaloneProperty", value: true }],
                    },
                ],
            }),
        );

        expect(result.wam.areas[0]?.properties).toEqual([]);
        expect(result.diagnostics).toContainEqual({
            path: "areas[0].properties[0]",
            feature: "unknownStandaloneProperty",
            reason: "unknown_property",
        });
    });

    it("restores the current SceneOverlay format after normalization", () => {
        const normalized = normalizeStandaloneWam(
            createLegacyWam({
                entities: {
                    chair: {
                        x: 32,
                        y: 64,
                        prefabRef: { collectionName: "basic furniture", id: "chair-down-grey" },
                        properties: [{ id: "audio", type: "playAudio", audioLink: "./sound.mp3" }],
                    },
                },
                areas: [
                    {
                        id: "start",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "start",
                        properties: [{ id: "start", type: "start", isDefault: true }],
                    },
                ],
            }),
        );
        const storageWam = standaloneWamToStorageDto(normalized.wam);
        const overlay = createSceneOverlay(standaloneSceneRegistry.home, [], storageWam);
        const merged = mergeSceneOverlay(createLegacyWam() as WAMFileFormat, standaloneSceneRegistry.home, overlay);

        expect(merged.ok).toBe(true);
        expect(merged.wam.entities.chair).toBeDefined();
        expect(merged.wam.areas[0]?.properties[0]).toMatchObject({ type: "start" });
    });

    it("loads existing Home and Office overlays from IndexedDB and keeps scene isolation", async () => {
        const storage = new IndexedDBSceneStorage(new IDBFactory());
        const home = createSceneOverlay(
            standaloneSceneRegistry.home,
            [],
            standaloneWamToStorageDto(normalizeStandaloneWam(readWam("../../../public/maps/home/home.wam")).wam),
            "2026-07-13T12:00:00.000Z",
        );
        const office = createSceneOverlay(
            standaloneSceneRegistry.office,
            [],
            standaloneWamToStorageDto(normalizeStandaloneWam(readWam("../../../public/maps/office/office.wam")).wam),
            "2026-07-13T12:01:00.000Z",
        );

        await storage.saveOverlay("home", home);
        await storage.saveOverlay("office", office);

        await expect(storage.loadOverlay("home")).resolves.toEqual(home);
        await expect(storage.loadOverlay("office")).resolves.toEqual(office);
    });

    it("new overlays do not reintroduce unsupported legacy fields", () => {
        const normalized = normalizeStandaloneWam(
            createLegacyWam({
                areas: [
                    {
                        id: "legacy",
                        x: 0,
                        y: 0,
                        width: 64,
                        height: 64,
                        visible: true,
                        name: "legacy",
                        properties: [
                            { id: "jitsi", type: "jitsiRoomProperty", roomName: "room-a" },
                            { id: "audio", type: "playAudio", audioLink: "./sound.mp3" },
                        ],
                    },
                ],
            }),
        );

        const overlay = createSceneOverlay(
            standaloneSceneRegistry.home,
            [],
            standaloneWamToStorageDto(normalized.wam),
        );

        expect(overlay.areas[0]?.properties.map((property) => property.type)).toEqual(["playAudio"]);
    });
});
