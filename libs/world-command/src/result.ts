import { z } from "zod";
import { WORLD_COMMAND_SCHEMA_VERSION, WorldCommandTypeSchema, type WorldCommandType } from "./command";
import { WorldCommandErrorSchema, type WorldCommandError } from "./error";

export const WorldCommandStatusSchema = z.enum(["succeeded", "failed", "cancelled", "timed_out"]);
export type WorldCommandStatus = z.infer<typeof WorldCommandStatusSchema>;

export const WorldCommandResultSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: z.string(),
        type: WorldCommandTypeSchema,
        status: WorldCommandStatusSchema,
        sceneId: z.string().optional(),
        startedAt: z.string().datetime(),
        finishedAt: z.string().datetime(),
        data: z.unknown().optional(),
        error: WorldCommandErrorSchema.optional(),
    })
    .strict();

export interface WorldCommandResult<T = unknown> {
    schemaVersion: typeof WORLD_COMMAND_SCHEMA_VERSION;
    commandId: string;
    type: WorldCommandType;
    status: WorldCommandStatus;
    sceneId?: string;
    startedAt: string;
    finishedAt: string;
    data?: T;
    error?: WorldCommandError;
}
