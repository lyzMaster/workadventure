import { z } from "zod";

export const WorldCommandErrorCodeSchema = z.enum([
    "invalid_command",
    "unsupported_command",
    "duplicate_command_conflict",
    "scene_not_loaded",
    "scene_not_found",
    "scene_mismatch",
    "transition_in_progress",
    "character_not_found",
    "character_already_exists",
    "entity_not_found",
    "prefab_not_found",
    "invalid_target",
    "spawn_blocked",
    "collision_blocked",
    "path_not_found",
    "cancelled",
    "timeout",
    "texture_load_failed",
    "persistence_failed",
    "command_failed",
    "gateway_destroyed",
]);

export type WorldCommandErrorCode = z.infer<typeof WorldCommandErrorCodeSchema>;

export const WorldCommandErrorSchema = z
    .object({
        code: WorldCommandErrorCodeSchema,
        message: z.string(),
        details: z.record(z.unknown()).optional(),
    })
    .strict();

export interface WorldCommandError {
    code: WorldCommandErrorCode;
    message: string;
    details?: Record<string, unknown>;
}
