import { z } from "zod";
import { CommandIdSchema, StandaloneSceneIdSchema, WORLD_COMMAND_SCHEMA_VERSION, type WorldCommandEnvelope } from "../command";

const EmptyPayloadSchema = z.object({}).strict();
const DirectionSchema = z.enum(["up", "right", "down", "left"]);
const CharacterSayTypeSchema = z.enum(["speech", "thinking"]);
const PositionSchema = z
    .object({
        x: z.number().finite(),
        y: z.number().finite(),
    })
    .strict();
const CharacterPositionSchema = PositionSchema.extend({
    direction: DirectionSchema,
    moving: z.boolean(),
}).strict();
const CharacterTextureSchema = z
    .object({
        id: z.string().trim().min(1),
        url: z.string().trim().min(1),
        layer: z.number().int().optional(),
    })
    .strict();
const CharacterAppearanceSchema = z
    .object({
        textures: z.array(CharacterTextureSchema).min(1),
        companionTextureId: z.string().nullable().optional(),
    })
    .strict();
const CharacterMovementConfigSchema = z
    .object({
        walkingSpeed: z.number().positive(),
        runningMultiplier: z.number().positive(),
    })
    .strict();

export const AgentSpawnPayloadSchema = z
    .object({
        characterId: z.string().trim().min(1).max(128),
        name: z.string().trim().min(1).max(128),
        sceneId: StandaloneSceneIdSchema,
        appearance: CharacterAppearanceSchema,
        spawnPosition: CharacterPositionSchema,
        movementConfig: CharacterMovementConfigSchema.optional(),
    })
    .strict();

export const AgentListPayloadSchema = EmptyPayloadSchema;

export const AgentGetStatePayloadSchema = z
    .object({
        characterId: z.string().trim().min(1).max(128),
    })
    .strict();

export const AgentMoveToPayloadSchema = z
    .object({
        characterId: z.string().trim().min(1).max(128),
        target: PositionSchema,
        options: z
            .object({
                tryFindingNearestAvailable: z.boolean().optional(),
                timeoutMs: z.number().int().positive().max(60_000).optional(),
                maxCalculations: z.number().int().positive().max(10_000).optional(),
                speed: z.number().positive().max(100).optional(),
            })
            .strict()
            .optional(),
    })
    .strict();

export const AgentStopPayloadSchema = AgentGetStatePayloadSchema;

export const AgentFacePayloadSchema = z
    .object({
        characterId: z.string().trim().min(1).max(128),
        direction: DirectionSchema,
    })
    .strict();

export const AgentSpeakPayloadSchema = z
    .object({
        characterId: z.string().trim().min(1).max(128),
        text: z.string().max(1_000),
        type: CharacterSayTypeSchema.optional(),
    })
    .strict();

export const AgentClearSpeechPayloadSchema = AgentGetStatePayloadSchema;
export const AgentRemovePayloadSchema = AgentGetStatePayloadSchema;

export const AgentSpawnCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.spawn"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentSpawnPayloadSchema,
    })
    .strict();

export const AgentListCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.list"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentListPayloadSchema,
    })
    .strict();

export const AgentGetStateCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.getState"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentGetStatePayloadSchema,
    })
    .strict();

export const AgentMoveToCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.moveTo"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentMoveToPayloadSchema,
    })
    .strict();

export const AgentStopCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.stop"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentStopPayloadSchema,
    })
    .strict();

export const AgentFaceCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.face"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentFacePayloadSchema,
    })
    .strict();

export const AgentSpeakCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.speak"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentSpeakPayloadSchema,
    })
    .strict();

export const AgentClearSpeechCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.clearSpeech"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentClearSpeechPayloadSchema,
    })
    .strict();

export const AgentRemoveCommandSchema = z
    .object({
        schemaVersion: z.literal(WORLD_COMMAND_SCHEMA_VERSION),
        commandId: CommandIdSchema,
        type: z.literal("agent.remove"),
        sceneId: StandaloneSceneIdSchema.optional(),
        payload: AgentRemovePayloadSchema,
    })
    .strict();

export const AgentCommandSchema = z.discriminatedUnion("type", [
    AgentSpawnCommandSchema,
    AgentListCommandSchema,
    AgentGetStateCommandSchema,
    AgentMoveToCommandSchema,
    AgentStopCommandSchema,
    AgentFaceCommandSchema,
    AgentSpeakCommandSchema,
    AgentClearSpeechCommandSchema,
    AgentRemoveCommandSchema,
]);

export type AgentSpawnCommand = WorldCommandEnvelope<"agent.spawn", z.infer<typeof AgentSpawnPayloadSchema>>;
export type AgentListCommand = WorldCommandEnvelope<"agent.list", z.infer<typeof AgentListPayloadSchema>>;
export type AgentGetStateCommand = WorldCommandEnvelope<"agent.getState", z.infer<typeof AgentGetStatePayloadSchema>>;
export type AgentMoveToCommand = WorldCommandEnvelope<"agent.moveTo", z.infer<typeof AgentMoveToPayloadSchema>>;
export type AgentStopCommand = WorldCommandEnvelope<"agent.stop", z.infer<typeof AgentStopPayloadSchema>>;
export type AgentFaceCommand = WorldCommandEnvelope<"agent.face", z.infer<typeof AgentFacePayloadSchema>>;
export type AgentSpeakCommand = WorldCommandEnvelope<"agent.speak", z.infer<typeof AgentSpeakPayloadSchema>>;
export type AgentClearSpeechCommand = WorldCommandEnvelope<
    "agent.clearSpeech",
    z.infer<typeof AgentClearSpeechPayloadSchema>
>;
export type AgentRemoveCommand = WorldCommandEnvelope<"agent.remove", z.infer<typeof AgentRemovePayloadSchema>>;
export type AgentCommand = z.infer<typeof AgentCommandSchema>;
