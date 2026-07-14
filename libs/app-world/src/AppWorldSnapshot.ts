import { z } from "zod";
import { PersistedSceneStateSchema } from "./PersistedSceneState";

export const APP_WORLD_SCHEMA_VERSION = 1 as const;

export const AppWorldSnapshotSchema = z
    .object({
        schemaVersion: z.literal(APP_WORLD_SCHEMA_VERSION),
        worldId: z.string().trim().min(1),
        revision: z.number().int().nonnegative(),
        activeSceneId: z.string().trim().min(1),
        scenes: z.record(PersistedSceneStateSchema),
        updatedAt: z.string().datetime(),
    })
    .strict();
export type AppWorldSnapshot = z.infer<typeof AppWorldSnapshotSchema>;
