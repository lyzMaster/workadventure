import { z } from "zod";
import { CommandIdSchema, StandaloneSceneIdSchema, WORLD_COMMAND_SCHEMA_VERSION, type WorldCommandEnvelope } from "../command";
import { AgentCommandSchema } from "./AgentCommandSchema";
import { FurnitureCommandSchema } from "./FurnitureCommandSchema";
import { SceneCommandSchema } from "./SceneCommandSchema";

const EmptyPayloadSchema = z.object({}).strict();

export const HistoryUndoCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("history.undo"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: EmptyPayloadSchema,
    })
    .strict();

export const HistoryRedoCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("history.redo"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: EmptyPayloadSchema,
    })
    .strict();

export const WorldFlushCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("world.flush"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: EmptyPayloadSchema,
    })
    .strict();

export const WorldCommandSchema = z.discriminatedUnion("type", [
    ...SceneCommandSchema.options,
    ...AgentCommandSchema.options,
    ...FurnitureCommandSchema.options,
    HistoryUndoCommandSchema,
    HistoryRedoCommandSchema,
    WorldFlushCommandSchema,
]);

export type HistoryUndoCommand = WorldCommandEnvelope<"history.undo", Record<string, never>>;
export type HistoryRedoCommand = WorldCommandEnvelope<"history.redo", Record<string, never>>;
export type WorldFlushCommand = WorldCommandEnvelope<"world.flush", Record<string, never>>;
export type WorldCommand = z.infer<typeof WorldCommandSchema>;

export function parseWorldCommand(input: unknown): WorldCommand {
    return WorldCommandSchema.parse(input);
}
