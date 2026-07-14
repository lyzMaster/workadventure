import { z } from "zod";
import {
    PersistedAgentStateSchema,
    PersistedPlayerStateSchema,
} from "./PersistedCharacterState";

export const PersistedSceneStateSchema = z
    .object({
        sceneId: z.string().trim().min(1),
        baseMapId: z.string().trim().min(1),
        baseMapRevision: z.number().int().nonnegative(),
        player: PersistedPlayerStateSchema.optional(),
        agents: z.record(PersistedAgentStateSchema),
    })
    .strict();
export type PersistedSceneState = z.infer<typeof PersistedSceneStateSchema>;
