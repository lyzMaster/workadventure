import { z } from "zod";

export const WORLD_COMMAND_SCHEMA_VERSION = 1 as const;
export const WorldCommandSchemaVersionSchema = z.literal(WORLD_COMMAND_SCHEMA_VERSION);

export const StandaloneSceneIdSchema = z.enum(["home", "office"]);
export type StandaloneSceneId = z.infer<typeof StandaloneSceneIdSchema>;

export const CommandIdSchema = z.string().trim().min(1).max(128);

export const WorldCommandTypeSchema = z.enum([
    "scene.getState",
    "scene.switch",
    "agent.spawn",
    "agent.list",
    "agent.getState",
    "agent.moveTo",
    "agent.stop",
    "agent.face",
    "agent.speak",
    "agent.clearSpeech",
    "agent.remove",
    "furniture.listCatalog",
    "furniture.list",
    "furniture.getState",
    "furniture.place",
    "furniture.move",
    "furniture.setVariant",
    "furniture.remove",
    "history.undo",
    "history.redo",
    "world.flush",
]);
export type WorldCommandType = z.infer<typeof WorldCommandTypeSchema>;

export const EnvelopeBaseSchema = z
    .object({
        schemaVersion: WorldCommandSchemaVersionSchema,
        commandId: CommandIdSchema,
        type: WorldCommandTypeSchema,
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: z.unknown(),
    })
    .strict();

export interface WorldCommandEnvelope<
    TType extends WorldCommandType = WorldCommandType,
    TPayload = unknown,
> {
    schemaVersion: typeof WORLD_COMMAND_SCHEMA_VERSION;
    commandId: string;
    type: TType;
    sceneId?: StandaloneSceneId;
    payload: TPayload;
}
