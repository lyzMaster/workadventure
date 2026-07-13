import { AreaData, WAMEntityData, type WAMFileFormat } from "@workadventure/map-editor";
import { z } from "zod";
import type { StandaloneSceneDefinition } from "./StandaloneSceneDefinition";

export const SceneOverlay = z.object({
    schemaVersion: z.literal(1),
    sceneId: z.string(),
    baseMapId: z.string(),
    baseMapRevision: z.number().int().nonnegative(),
    baseEntityIds: z.array(z.string()),
    entities: z.record(WAMEntityData),
    areas: z.array(AreaData),
    updatedAt: z.string().datetime(),
});

export type SceneOverlay = z.infer<typeof SceneOverlay>;

export type OverlayMergeResult =
    | { ok: true; wam: WAMFileFormat; overlay: SceneOverlay | null }
    | {
          ok: false;
          wam: WAMFileFormat;
          code: "validation_failed" | "scene_mismatch" | "base_map_mismatch" | "base_revision_mismatch";
          message: string;
      };

export function createSceneOverlay(
    definition: StandaloneSceneDefinition,
    baseEntityIds: readonly string[],
    wam: WAMFileFormat,
    updatedAt = new Date().toISOString(),
): SceneOverlay {
    return SceneOverlay.parse({
        schemaVersion: 1,
        sceneId: definition.sceneId,
        baseMapId: definition.baseMapId,
        baseMapRevision: definition.baseMapRevision,
        baseEntityIds: [...baseEntityIds],
        entities: structuredClone(wam.entities),
        areas: structuredClone(wam.areas),
        updatedAt,
    });
}

export function mergeSceneOverlay(
    baseWam: WAMFileFormat,
    definition: StandaloneSceneDefinition,
    input: unknown,
): OverlayMergeResult {
    const parsed = SceneOverlay.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            wam: structuredClone(baseWam),
            code: "validation_failed",
            message: `Invalid SceneOverlay: ${parsed.error.message}`,
        };
    }
    const overlay = parsed.data;
    if (overlay.sceneId !== definition.sceneId) {
        return {
            ok: false,
            wam: structuredClone(baseWam),
            code: "scene_mismatch",
            message: `Overlay sceneId "${overlay.sceneId}" does not match "${definition.sceneId}"`,
        };
    }
    if (overlay.baseMapId !== definition.baseMapId) {
        return {
            ok: false,
            wam: structuredClone(baseWam),
            code: "base_map_mismatch",
            message: `Overlay baseMapId "${overlay.baseMapId}" does not match "${definition.baseMapId}"`,
        };
    }
    if (overlay.baseMapRevision !== definition.baseMapRevision) {
        return {
            ok: false,
            wam: structuredClone(baseWam),
            code: "base_revision_mismatch",
            message: `Overlay baseMapRevision ${overlay.baseMapRevision} does not match ${definition.baseMapRevision}`,
        };
    }

    return {
        ok: true,
        overlay,
        wam: {
            ...structuredClone(baseWam),
            entities: structuredClone(overlay.entities),
            areas: structuredClone(overlay.areas),
        },
    };
}
