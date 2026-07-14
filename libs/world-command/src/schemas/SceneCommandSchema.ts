import { z } from "zod";
import {
    CommandIdSchema,
    EnvelopeBaseSchema,
    StandaloneSceneIdSchema,
    WORLD_COMMAND_SCHEMA_VERSION,
    type WorldCommandEnvelope,
} from "../command";

const EmptyPayloadSchema = z.object({}).strict();

export const SceneGetStatePayloadSchema = EmptyPayloadSchema;
export type SceneGetStatePayload = z.infer<typeof SceneGetStatePayloadSchema>;

export const SceneSwitchPayloadSchema = z
    .object({
        sceneId: StandaloneSceneIdSchema,
    })
    .strict();
export type SceneSwitchPayload = z.infer<typeof SceneSwitchPayloadSchema>;

export const SceneGetStateCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("scene.getState"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: SceneGetStatePayloadSchema,
    })
    .strict();

export const SceneSwitchCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("scene.switch"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: SceneSwitchPayloadSchema,
    })
    .strict();

export const SceneCommandSchema = z.discriminatedUnion("type", [SceneGetStateCommandSchema, SceneSwitchCommandSchema]);

export type SceneGetStateCommand = WorldCommandEnvelope<"scene.getState", SceneGetStatePayload>;
export type SceneSwitchCommand = WorldCommandEnvelope<"scene.switch", SceneSwitchPayload>;
export type SceneCommand = z.infer<typeof SceneCommandSchema>;

void EnvelopeBaseSchema;
