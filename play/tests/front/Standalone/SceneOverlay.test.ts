import type { WAMEntityData, WAMFileFormat } from "@workadventure/map-editor";
import { describe, expect, it } from "vitest";
import { createSceneOverlay, mergeSceneOverlay } from "../../../src/standalone/SceneOverlay";
import { standaloneSceneRegistry } from "../../../src/standalone/StandaloneSceneRegistry";

const homeChair: WAMEntityData = {
    x: 32,
    y: 64,
    prefabRef: { collectionName: "basic furniture", id: "chair-down-grey" },
    properties: [],
};

const officeDesk: WAMEntityData = {
    x: 128,
    y: 96,
    prefabRef: { collectionName: "basic furniture", id: "table-down-grey" },
    properties: [],
};

function createWam(entities: Record<string, WAMEntityData> = {}): WAMFileFormat {
    return {
        version: "2.1.0",
        mapUrl: "./map.tmj",
        entities,
        areas: [],
        entityCollections: [],
    };
}

describe("SceneOverlay", () => {
    it("does not merge the home overlay into office", () => {
        const overlay = createSceneOverlay(standaloneSceneRegistry.home, [], createWam({ homeChair }));
        const result = mergeSceneOverlay(createWam(), standaloneSceneRegistry.office, overlay);

        expect(result.ok).toBe(false);
        expect(result.wam.entities).toEqual({});
    });

    it("does not merge the office overlay into home", () => {
        const overlay = createSceneOverlay(standaloneSceneRegistry.office, [], createWam({ officeDesk }));
        const result = mergeSceneOverlay(createWam(), standaloneSceneRegistry.home, overlay);

        expect(result.ok).toBe(false);
        expect(result.wam.entities).toEqual({});
    });

    it("uses the base WAM when baseMapRevision does not match", () => {
        const overlay = {
            ...createSceneOverlay(standaloneSceneRegistry.home, [], createWam({ homeChair })),
            baseMapRevision: standaloneSceneRegistry.home.baseMapRevision + 1,
        };
        const result = mergeSceneOverlay(createWam(), standaloneSceneRegistry.home, overlay);

        expect(result.ok).toBe(false);
        expect(result).toMatchObject({ code: "base_revision_mismatch" });
        expect(result.wam.entities).toEqual({});
    });
});
