import { describe, expect, it } from "vitest";
import {
    AppWorldSnapshotSchema,
    migrateAppWorldSnapshot,
    runtimeAppearanceToPersisted,
} from "@workadventure/app-world";

describe("AppWorld schema", () => {
    it("accepts an empty world", () => {
        const snapshot = AppWorldSnapshotSchema.parse({
            schemaVersion: 1,
            worldId: "standalone-default-world",
            revision: 0,
            activeSceneId: "home",
            scenes: {},
            updatedAt: "2026-07-14T00:00:00.000Z",
        });

        expect(snapshot.scenes).toEqual({});
    });

    it("round-trips a valid snapshot as JSON", () => {
        const snapshot = AppWorldSnapshotSchema.parse({
            schemaVersion: 1,
            worldId: "standalone-default-world",
            revision: 2,
            activeSceneId: "office",
            scenes: {
                office: {
                    sceneId: "office",
                    baseMapId: "standalone-office",
                    baseMapRevision: 2,
                    player: {
                        position: { x: 64, y: 96, direction: "left" },
                        updatedAt: "2026-07-14T00:00:00.000Z",
                    },
                    agents: {
                        "agent-a": {
                            characterId: "agent-a",
                            name: "Agent A",
                            sceneId: "office",
                            appearance: {
                                textures: [{ id: "body-01", assetPath: "/resources/characters/body-01.png", layer: 0 }],
                            },
                            movementConfig: { walkingSpeed: 9, runningMultiplier: 2.5 },
                            position: { x: 128, y: 160, direction: "down" },
                            updatedAt: "2026-07-14T00:00:00.000Z",
                        },
                    },
                },
            },
            updatedAt: "2026-07-14T00:00:01.000Z",
        });

        expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    });

    it("rejects unknown fields strictly", () => {
        expect(() =>
            AppWorldSnapshotSchema.parse({
                schemaVersion: 1,
                worldId: "standalone-default-world",
                revision: 0,
                activeSceneId: "home",
                scenes: {},
                updatedAt: "2026-07-14T00:00:00.000Z",
                extra: true,
            }),
        ).toThrow();
    });

    it("reports unsupported schema versions", () => {
        const result = migrateAppWorldSnapshot({
            schemaVersion: 999,
            worldId: "standalone-default-world",
            revision: 0,
            activeSceneId: "home",
            scenes: {},
            updatedAt: "2026-07-14T00:00:00.000Z",
        });

        expect(result.ok).toBe(false);
        expect(result.diagnostics).toMatchObject([{ code: "unsupported_schema_version" }]);
    });

    it("falls back when a damaged snapshot contains invalid children", () => {
        const result = migrateAppWorldSnapshot({
            schemaVersion: 1,
            worldId: "standalone-default-world",
            revision: 0,
            activeSceneId: "home",
            scenes: {
                home: {
                    sceneId: "home",
                    baseMapId: "standalone-home",
                    baseMapRevision: 1,
                    player: { updatedAt: "2026-07-14T00:00:00.000Z" },
                    agents: {
                        broken: {
                            characterId: "broken",
                            name: "Broken",
                            sceneId: "home",
                            appearance: { textures: [] },
                            position: { x: 0, y: 0, direction: "down" },
                            updatedAt: "2026-07-14T00:00:00.000Z",
                        },
                    },
                },
            },
            updatedAt: "2026-07-14T00:00:00.000Z",
        });

        expect(result.ok).toBe(true);
        expect(result.snapshot?.scenes.home.player).toBeUndefined();
        expect(result.snapshot?.scenes.home.agents).toEqual({});
        expect(result.diagnostics.map((item) => item.code)).toEqual(
            expect.arrayContaining(["player_dropped", "agent_dropped"]),
        );
    });

    it("validates persisted assetPath and rejects remote/blob/data/javascript URLs", () => {
        const persisted = runtimeAppearanceToPersisted({
            textures: [{ id: "body-01", url: "/resources/characters/body-01.png", layer: 0 }],
        });
        expect(persisted.textures[0]?.assetPath).toBe("/resources/characters/body-01.png");

        for (const url of [
            "https://example.test/body.png",
            "blob:https://example.test/body.png",
            "data:image/png;base64,AAAA",
            "javascript:alert(1)",
        ]) {
            expect(() =>
                runtimeAppearanceToPersisted({
                    textures: [{ id: "body-01", url, layer: 0 }],
                }),
            ).toThrow();
        }
    });

    it("does not allow moving, speech, path, command or companionTextureId fields into persisted DTOs", () => {
        const result = migrateAppWorldSnapshot({
            schemaVersion: 1,
            worldId: "standalone-default-world",
            revision: 0,
            activeSceneId: "home",
            scenes: {
                home: {
                    sceneId: "home",
                    baseMapId: "standalone-home",
                    baseMapRevision: 1,
                    agents: {
                        "agent-a": {
                            characterId: "agent-a",
                            name: "Agent A",
                            sceneId: "home",
                            appearance: {
                                textures: [
                                    {
                                        id: "body-01",
                                        assetPath: "/resources/characters/body-01.png",
                                        layer: 0,
                                        companionTextureId: "deprecated",
                                    },
                                ],
                                companionTextureId: "deprecated",
                            },
                            movementConfig: { walkingSpeed: 9, runningMultiplier: 2.5 },
                            position: { x: 64, y: 64, direction: "down", moving: true },
                            speech: "hello",
                            path: [{ x: 1, y: 2 }],
                            commandId: "cmd-1",
                            updatedAt: "2026-07-14T00:00:00.000Z",
                        },
                    },
                },
            },
            updatedAt: "2026-07-14T00:00:00.000Z",
        });

        expect(result.ok).toBe(true);
        expect(result.snapshot?.scenes.home.agents).toEqual({});
        expect(result.diagnostics.map((item) => item.code)).toContain("agent_dropped");
    });
});
